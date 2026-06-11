from ninja import NinjaAPI, Schema
from ninja.errors import HttpError
from datetime import date, timedelta
import logging
import re
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.core.exceptions import ObjectDoesNotExist
from django.db import IntegrityError, transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    AuditLog,
    BorrowRequest, 
    BorrowRequestItem, 
    Borrower, 
    Category, 
    Item, 
    ItemStock, 
    MaintenanceRecord, 
    Notification, 
    ReturnRecord, 
    ReturnRecordItem,
    Room,
    Debt,
    Supplier,
    StockTransaction,
    UserProfile,
)

api = NinjaAPI(title="Lab Equipment Management API", version="1.0.0")
logger = logging.getLogger(__name__)

# 1. SCHEMAS (MÔ HÌNH DỮ LIỆU ĐẦU VÀO)
class LoginSchema(Schema):
    username: str
    password: str

class RegisterSchema(Schema):
    username: str
    password: str
    email: str
    role: str  # ADMIN, STAFF, BORROWER
    borrower_code: str | None = None

    full_name: str | None = None
    borrower_type: str = "STUDENT"
    department: str | None = None
    phone: str | None = None
    phone_number: str | None = None
    date_of_birth: str | None = None
    faculty: str | None = None
    major: str | None = None
    class_name: str | None = None
    academic_year: str | None = None
    study_status: str | None = None

class CategoryCreateUpdateSchema(Schema):
    name: str
    description: str | None = None

class SupplierCreateUpdateSchema(Schema):
    supplier_name: str
    contact_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None

class ItemCreateUpdateSchema(Schema):
    equipment_id: str
    item_code: str
    item_name: str
    category_id: int
    supplier_id: int | None = None
    unit: str
    requires_return: bool = True
    minimum_quantity: int = 0
    description: str | None = None
    documentation_url: str | None = None
    purchase_price: int = 0
    rental_price: int = 0
    total_quantity: int | None = None

class RoomCreateUpdateSchema(Schema):
    room_code: str
    room_name: str
    location: str | None = None

class BorrowerCreateUpdateSchema(Schema):
    borrower_code: str | None = None
    student_id: str | None = None
    full_name: str
    borrower_type: str  # STUDENT, LECTURER, RESEARCHER, EXTERNAL
    department: str | None = None
    email: str | None = None
    phone: str | None = None
    phone_number: str | None = None
    date_of_birth: str | None = None
    faculty: str | None = None
    major: str | None = None
    class_name: str | None = None
    academic_year: str | None = None
    study_status: str | None = None
    status: str = "ACTIVE"  # ACTIVE, BLACKLISTED, INACTIVE

class BorrowerPatchSchema(Schema):
    borrower_code: str | None = None
    student_id: str | None = None
    full_name: str | None = None
    borrower_type: str | None = None
    department: str | None = None
    email: str | None = None
    phone: str | None = None
    phone_number: str | None = None
    date_of_birth: str | None = None
    faculty: str | None = None
    major: str | None = None
    class_name: str | None = None
    academic_year: str | None = None
    study_status: str | None = None
    status: str | None = None

class BorrowRequestSchema(Schema):
    borrower_id: int
    expected_return_date: str
    note: str | None = None

class BorrowRequestItemSchema(Schema):
    request_id: int
    item_id: int
    quantity: int

class ReturnSchema(Schema):
    request_id: int
    borrow_item_id: int
    quantity: int
    returned_condition: str  # GOOD, DAMAGED, BROKEN, LOST
    note: str | None = None

class NotificationCreateSchema(Schema):
    borrower_code: str
    title: str
    content: str

class BorrowerStatusSchema(Schema):
    status: str


MAX_BORROW_DAYS = 153


def notify_borrower(borrower, title: str, content: str):
    return Notification.objects.create(borrower=borrower, title=title, content=content)


def active_username(request):
    if not request:
        return "SYSTEM"
    return request.user.username if request.user.is_authenticated else "SYSTEM"


def validate_vn_phone(phone_number: str | None):
    if phone_number and not re.fullmatch(r"(03|05|07|08|09)\d{8}", phone_number):
        raise HttpError(400, "Phone number must be exactly 10 digits and start with 03, 05, 07, 08, or 09.")


def parse_optional_date(value: str | None):
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise HttpError(400, "Date of birth must be YYYY-MM-DD")


def normalize_borrower_payload(data: dict, partial: bool = False):
    data = {key: value for key, value in data.items() if value is not None or not partial}
    student_id = data.pop("student_id", None)
    if student_id:
        data["borrower_code"] = student_id
    if not partial and not data.get("borrower_code"):
        raise HttpError(400, "Student ID is required")
    if "phone_number" in data or "phone" in data:
        validate_vn_phone(data.get("phone_number") or data.get("phone"))
        if not data.get("phone_number"):
            data["phone_number"] = data.get("phone")
        if not data.get("phone"):
            data["phone"] = data.get("phone_number")
    if "date_of_birth" in data:
        data["date_of_birth"] = parse_optional_date(data.get("date_of_birth"))
    if "status" in data and data["status"] not in {"ACTIVE", "BLOCKED"}:
        raise HttpError(400, "Invalid borrower status")
    return data


def sync_borrower_user(borrower):
    for profile in UserProfile.objects.select_related("user").filter(borrower=borrower):
        user = profile.user
        user.email = borrower.email or user.email
        if profile.role == "BORROWER" and borrower.borrower_code:
            user.username = borrower.borrower_code
        user.is_active = borrower.status == "ACTIVE"
        user.save(update_fields=["username", "email", "is_active"])


def resolve_profile_borrower(user, profile, source: str = "profile"):
    borrower = profile.borrower
    logger.info(
        "%s borrower lookup: user_id=%s username=%s profile_id=%s borrower_id=%s",
        source,
        user.id,
        user.username,
        profile.id,
        borrower.id if borrower else None,
    )
    if borrower:
        return borrower

    if profile.role != "BORROWER":
        logger.warning(
            "%s borrower lookup failed: user_id=%s username=%s profile_id=%s role=%s is not BORROWER",
            source,
            user.id,
            user.username,
            profile.id,
            profile.role,
        )
        return None

    borrower = Borrower.objects.filter(borrower_code=user.username).first()
    if not borrower and user.email:
        borrower = Borrower.objects.filter(email=user.email).first()

    if borrower:
        profile.borrower = borrower
        profile.save(update_fields=["borrower"])
        logger.warning(
            "%s repaired missing borrower link: user_id=%s username=%s profile_id=%s borrower_id=%s",
            source,
            user.id,
            user.username,
            profile.id,
            borrower.id,
        )
        return borrower

    logger.warning(
        "%s borrower lookup failed: user_id=%s username=%s profile_id=%s has no matching Borrower",
        source,
        user.id,
        user.username,
        profile.id,
    )
    return None


def condition_payment_rate(condition: str) -> tuple[int, int]:
    normalized = condition.upper()
    rates = {
        "GOOD": (0, 100),
        "NORMAL": (0, 100),
        "LIGHT_DAMAGE": (20, 100),
        "DAMAGED": (20, 100),
        "HEAVY_DAMAGE": (60, 100),
        "BROKEN": (60, 100),
        "LOST_OR_DESTROYED": (100, 100),
        "LOST": (100, 100),
    }
    if normalized not in rates:
        raise HttpError(400, "Invalid returned condition")
    return rates[normalized]


def borrower_payload(borrower):
    return {
        "id": borrower.id,
        "borrower_code": borrower.borrower_code,
        "student_id": borrower.borrower_code,
        "full_name": borrower.full_name,
        "borrower_type": borrower.borrower_type,
        "department": borrower.department,
        "email": borrower.email,
        "phone": borrower.phone,
        "phone_number": borrower.phone_number,
        "date_of_birth": borrower.date_of_birth,
        "faculty": borrower.faculty,
        "major": borrower.major,
        "class_name": borrower.class_name,
        "academic_year": borrower.academic_year,
        "study_status": borrower.study_status,
        "status": borrower.status,
        "created_at": borrower.created_at,
    }


def borrower_detail_payload(borrower):
    current_items = []
    current_equipment_value = 0
    current_quantity = 0
    for item in BorrowRequestItem.objects.select_related("item", "request").filter(
        request__borrower=borrower,
        request__status="APPROVED",
        status="APPROVED",
        item__requires_return=True,
    ):
        returned = ReturnRecordItem.objects.filter(borrow_item=item).aggregate(total=Sum("quantity"))["total"] or 0
        remaining = item.quantity - returned
        if remaining <= 0:
            continue
        line_value = remaining * item.item.purchase_price
        current_equipment_value += line_value
        current_quantity += remaining
        current_items.append({
            "borrow_item_id": item.id,
            "request_id": item.request_id,
            "equipment_id": item.item.equipment_id,
            "item_name": item.item.item_name,
            "quantity": item.quantity,
            "remaining_quantity": remaining,
            "purchase_price": item.item.purchase_price,
            "line_value": line_value,
            "expected_return_date": item.request.expected_return_date,
        })

    requests = BorrowRequest.objects.filter(borrower=borrower)
    debts = Debt.objects.select_related("borrow_item__item").filter(borrower=borrower).order_by("-created_at")
    notifications = Notification.objects.filter(borrower=borrower).order_by("-created_at")
    history = []
    for req in requests.prefetch_related("items__item").order_by("-request_date"):
        for item in req.items.all():
            history.append({
                "request_id": req.id,
                "request_date": req.request_date,
                "expected_return_date": req.expected_return_date,
                "item_name": item.item.item_name,
                "equipment_id": item.item.equipment_id,
                "quantity": item.quantity,
                "status": item.status,
                "borrow_request_status": req.status,
            })

    return {
        "student": borrower_payload(borrower),
        "borrow_statistics": {
            "total_requests": requests.count(),
            "pending_requests": requests.filter(status="PENDING").count(),
            "approved_requests": requests.filter(status="APPROVED").count(),
            "completed_requests": requests.filter(status="COMPLETED").count(),
            "rejected_requests": requests.filter(status="REJECTED").count(),
            "current_borrowed_quantity": current_quantity,
        },
        "current_borrowed_equipment": current_items,
        "current_equipment_value": current_equipment_value,
        "debt_summary": {
            "total_unpaid": sum(debt.amount for debt in debts if debt.status == "UNPAID"),
            "total_paid": sum(debt.amount for debt in debts if debt.status == "PAID"),
            "unpaid_count": sum(1 for debt in debts if debt.status == "UNPAID"),
            "total_records": debts.count(),
        },
        "payment_request_history": [
            {
                "id": debt.id,
                "item": debt.borrow_item.item.item_name,
                "equipment_id": debt.borrow_item.item.equipment_id,
                "amount": debt.amount,
                "reason": debt.reason,
                "status": debt.status,
                "created_at": debt.created_at,
                "paid_at": debt.paid_at,
            }
            for debt in debts
        ],
        "notification_history": [
            {
                "id": n.id,
                "title": n.title,
                "content": n.content,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in notifications
        ],
        "borrow_history": history,
    }

# 2. AUTHENTICATION & USER APIs (Xác thực & Người dùng)

@api.post("/auth/register")
def register(request, payload: RegisterSchema):
    if User.objects.filter(username=payload.username).exists():
        return {"success": False, "message": "Username already exists"}
    validate_vn_phone(payload.phone_number or payload.phone)

    with transaction.atomic():
        borrower = None
        if payload.borrower_code:
            borrower = Borrower.objects.filter(borrower_code=payload.borrower_code).first()
            if not borrower and payload.full_name:
                borrower = Borrower.objects.create(
                    borrower_code=payload.borrower_code,
                    full_name=payload.full_name,
                    borrower_type=payload.borrower_type,
                    department=payload.department,
                    email=payload.email,
                    phone=payload.phone,
                    phone_number=payload.phone_number or payload.phone,
                    date_of_birth=parse_optional_date(payload.date_of_birth),
                    faculty=payload.faculty,
                    major=payload.major,
                    class_name=payload.class_name,
                    academic_year=payload.academic_year,
                    study_status=payload.study_status,
                    status="ACTIVE",
                )
        user = User.objects.create_user(
            username=payload.username,
            password=payload.password,
            email=payload.email,
        )
        UserProfile.objects.create(user=user, role=payload.role, borrower=borrower)
    return {"success": True, "message": "User registered successfully"}

@api.post("/auth/login")
def login(request, payload: LoginSchema):
    candidate = User.objects.filter(username=payload.username).first()
    if not candidate:
        return {"success": False, "code": "INVALID_USERNAME", "message": "Invalid username"}
    if not candidate.check_password(payload.password):
        return {"success": False, "code": "INVALID_PASSWORD", "message": "Invalid password"}
    if not candidate.is_active:
        return {"success": False, "code": "ACCOUNT_DISABLED", "message": "Account disabled"}

    user = authenticate(request, username=payload.username, password=payload.password)
    if not user:
        return {"success": False, "code": "AUTH_FAILED", "message": "Authentication failed"}
    if not user.is_active:
        return {"success": False, "code": "ACCOUNT_DISABLED", "message": "Account disabled"}
    try:
        profile = user.userprofile
    except ObjectDoesNotExist:
        return {"success": False, "code": "PROFILE_MISSING", "message": "User profile is missing. Please ask an admin to assign a role."}
    borrower = resolve_profile_borrower(user, profile, "auth_login")
    if borrower and borrower.status == "DELETED":
        return {"success": False, "code": "ACCOUNT_DISABLED", "message": "Account disabled"}
    if borrower and borrower.status == "BLOCKED":
        return {"success": False, "code": "ACCOUNT_DISABLED", "message": "Account disabled"}
    django_login(request, user)
    return {
        "success": True,
        "message": "Login successful",
        "username": user.username,
        "email": user.email,
        "full_name": borrower.full_name if borrower else user.get_full_name(),
        "role": profile.role,
        "borrower_code": borrower.borrower_code if borrower else None,
    }

@api.get("/student/me")
def student_me(request):
    user = request.user
    if not user.is_authenticated:
        raise HttpError(401, "Authentication required")
    try:
        profile = user.userprofile
    except ObjectDoesNotExist:
        logger.warning(
            "student_me borrower lookup failed: user_id=%s username=%s has no UserProfile",
            user.id,
            user.username,
        )
        raise HttpError(403, "User profile is missing")
    borrower = resolve_profile_borrower(user, profile, "student_me")
    if not borrower:
        raise HttpError(403, "Only borrower accounts can access student profile")

    requests = BorrowRequest.objects.filter(borrower=borrower)
    active_requests = requests.filter(status="APPROVED")
    overdue_requests = active_requests.filter(
        Q(is_overdue=True) | Q(expected_return_date__lt=date.today())
    )
    debts = Debt.objects.select_related("borrow_item__item").filter(borrower=borrower).order_by("-created_at")
    unpaid_debts = debts.filter(status="UNPAID")

    current_items = []
    for item in BorrowRequestItem.objects.select_related("item", "request").filter(
        request__borrower=borrower,
        request__status="APPROVED",
        status="APPROVED",
        item__requires_return=True,
    ).order_by("-request__request_date"):
        returned = ReturnRecordItem.objects.filter(borrow_item=item).aggregate(total=Sum("quantity"))["total"] or 0
        remaining = item.quantity - returned
        if remaining <= 0:
            continue
        current_items.append({
            "borrow_item_id": item.id,
            "request_id": item.request_id,
            "equipment_id": item.item.equipment_id,
            "equipment_name": item.item.item_name,
            "quantity": remaining,
            "borrow_date": item.request.request_date,
            "due_date": item.request.expected_return_date,
            "status": "OVERDUE" if item.request.expected_return_date < date.today() or item.request.is_overdue else item.status,
        })

    student = borrower_payload(borrower)
    student["email"] = borrower.email or user.email
    flat_student = {
        "borrower_id": borrower.id,
        "student_id": borrower.borrower_code,
        "full_name": borrower.full_name,
        "email": student["email"],
        "phone_number": borrower.phone_number or borrower.phone,
        "date_of_birth": borrower.date_of_birth,
        "faculty": borrower.faculty,
        "major": borrower.major,
        "class_name": borrower.class_name,
        "academic_year": borrower.academic_year,
        "study_status": borrower.study_status,
        "status": borrower.status,
    }

    return {
        **flat_student,
        "student": student,
        "borrow_statistics": {
            "total_borrow_requests": requests.count(),
            "active_borrowings": active_requests.count(),
            "overdue_borrowings": overdue_requests.count(),
            "total_debts": debts.count(),
            "unpaid_debt_amount": sum(debt.amount for debt in unpaid_debts),
        },
        "current_borrowed_equipment": current_items,
        "outstanding_debts": [
            {
                "id": debt.id,
                "reason": debt.reason or f"Payment request for {debt.borrow_item.item.item_name}",
                "amount": debt.amount,
                "status": debt.status,
                "created_at": debt.created_at,
            }
            for debt in unpaid_debts
        ],
        "recent_notifications": [
            {
                "id": notification.id,
                "title": notification.title,
                "message": notification.content,
                "created_at": notification.created_at,
                "is_read": notification.is_read,
            }
            for notification in Notification.objects.filter(borrower=borrower).order_by("-created_at")[:10]
        ],
    }

@api.get("/auth/me")
def me(request):
    user = request.user
    if not user.is_authenticated:
        return {"authenticated": False}
    try:
        profile = user.userprofile
    except ObjectDoesNotExist:
        return {"authenticated": False, "message": "User profile is missing"}
    borrower = resolve_profile_borrower(user, profile, "auth_me")
    return {
        "authenticated": True,
        "username": user.username,
        "email": user.email,
        "full_name": borrower.full_name if borrower else user.get_full_name(),
        "role": profile.role,
        "borrower_code": borrower.borrower_code if borrower else None,
    }

@api.post("/auth/logout")
def logout(request):
    django_logout(request)
    return {"success": True}

@api.get("/users")
def get_all_users(request):
    return [
        {"username": profile.user.username, "role": profile.role}
        for profile in UserProfile.objects.all()
    ]


# ==========================================
# 3. CORE CRUD APIs (Quản lý danh mục thực thể)
# ==========================================

# --- CATEGORIES ---
@api.get("/categories")
def get_categories(request):
    return [
        {"id": c.id, "name": c.name, "description": c.description}
        for c in Category.objects.all()
    ]

@api.post("/categories")
def create_category(request, payload: CategoryCreateUpdateSchema):
    category = Category.objects.create(**payload.dict())
    return {"id": category.id, "message": "Category created successfully"}

@api.put("/categories/{category_id}")
def update_category(request, category_id: int, payload: CategoryCreateUpdateSchema):
    category = Category.objects.get(id=category_id)
    for attr, value in payload.dict().items():
        setattr(category, attr, value)
    category.save()
    return {"message": "Category updated successfully"}

@api.delete("/categories/{category_id}")
def delete_category(request, category_id: int):
    category = Category.objects.get(id=category_id)
    category.delete()
    return {"message": "Category deleted successfully"}


# --- SUPPLIERS ---
@api.get("/suppliers")
def get_suppliers(request):
    return [
        {
            "id": s.id,
            "supplier_name": s.supplier_name,
            "contact_name": s.contact_name,
            "phone": s.phone,
            "email": s.email,
            "address": s.address
        } for s in Supplier.objects.all()
    ]

@api.post("/suppliers")
def create_supplier(request, payload: SupplierCreateUpdateSchema):
    supplier = Supplier.objects.create(**payload.dict())
    return {"id": supplier.id, "message": "Supplier created successfully"}

@api.put("/suppliers/{supplier_id}")
def update_supplier(request, supplier_id: int, payload: SupplierCreateUpdateSchema):
    supplier = Supplier.objects.get(id=supplier_id)
    for attr, value in payload.dict().items():
        setattr(supplier, attr, value)
    supplier.save()
    return {"message": "Supplier updated successfully"}

@api.delete("/suppliers/{supplier_id}")
def delete_supplier(request, supplier_id: int):
    supplier = Supplier.objects.get(id=supplier_id)
    supplier.delete()
    return {"message": "Supplier deleted successfully"}


# --- ITEMS ---
@api.get("/items")
def get_items(request):
    result = []
    for item in Item.objects.select_related("category").filter(status="ACTIVE"):
        totals = ItemStock.objects.filter(item=item).aggregate(
            total=Sum("total_quantity"),
            available=Sum("available_quantity"),
        )
        result.append({
            "id": item.id,
            "equipment_id": item.equipment_id,
            "code": item.item_code,
            "name": item.item_name,
            "category": item.category.name,
            "supplier": item.supplier.supplier_name if item.supplier else None,
            "unit": item.unit,
            "requires_return": item.requires_return,
            "documentation_url": item.documentation_url,
            "purchase_price": item.purchase_price,
            "rental_price": item.rental_price,
            "minimum_quantity": item.minimum_quantity,
            "total_quantity": totals["total"] or 0,
            "available_quantity": totals["available"] or 0,
            "status": item.status,
        })
    return result

@api.get("/items/search")
def search_items(request, keyword: str):
    items = Item.objects.filter(status="ACTIVE", item_name__icontains=keyword)
    return [{"id": item.id, "name": item.item_name} for item in items]

@api.get("/items/{item_id}")
def item_detail(request, item_id: int):
    item = Item.objects.get(id=item_id)
    return {
        "id": item.id,
        "equipment_id": item.equipment_id,
        "item_code": item.item_code,
        "item_name": item.item_name,
        "category": item.category.name,
        "supplier": item.supplier.supplier_name if item.supplier else None,
        "purchase_price": item.purchase_price,
        "rental_price": item.rental_price,
        "minimum_quantity": item.minimum_quantity,
        "requires_return": item.requires_return,
        "documentation_url": item.documentation_url,
        "description": item.description,
        "unit": item.unit,
        "status": item.status,
    }

@api.post("/items")
def create_item(request, payload: ItemCreateUpdateSchema):
    data = payload.dict()
    if Item.objects.filter(equipment_id=data["equipment_id"]).exists():
        raise HttpError(400, "Equipment ID already exists")
    category_id = data.pop("category_id")
    supplier_id = data.pop("supplier_id", None)
    total_quantity = data.pop("total_quantity", None)
    
    category = Category.objects.get(id=category_id)
    supplier = Supplier.objects.get(id=supplier_id) if supplier_id else None
    
    with transaction.atomic():
        try:
            item = Item.objects.create(category=category, supplier=supplier, **data)
        except IntegrityError:
            raise HttpError(400, "Equipment ID or item code already exists")
        if total_quantity is not None:
            room, _ = Room.objects.get_or_create(
                room_code="MAIN",
                defaults={"room_name": "Main Storage", "location": "Default"},
            )
            ItemStock.objects.create(
                item=item,
                room=room,
                total_quantity=max(total_quantity, 0),
                available_quantity=max(total_quantity, 0),
            )
    return {"id": item.id, "message": "Item created successfully"}

@api.put("/items/{item_id}")
def update_item(request, item_id: int, payload: ItemCreateUpdateSchema):
    item = Item.objects.get(id=item_id)
    data = payload.dict()
    if Item.objects.exclude(id=item_id).filter(equipment_id=data["equipment_id"]).exists():
        raise HttpError(400, "Equipment ID already exists")
    category_id = data.pop("category_id")
    supplier_id = data.pop("supplier_id", None)
    total_quantity = data.pop("total_quantity", None)
    
    with transaction.atomic():
        item.category = Category.objects.get(id=category_id)
        item.supplier = Supplier.objects.get(id=supplier_id) if supplier_id else None
        
        for attr, value in data.items():
            setattr(item, attr, value)
        try:
            item.save()
        except IntegrityError:
            raise HttpError(400, "Equipment ID or item code already exists")
        if total_quantity is not None:
            room, _ = Room.objects.get_or_create(
                room_code="MAIN",
                defaults={"room_name": "Main Storage", "location": "Default"},
            )
            stock, _ = ItemStock.objects.select_for_update().get_or_create(
                item=item,
                room=room,
                defaults={"total_quantity": 0, "available_quantity": 0},
            )
            borrowed_quantity = max(stock.total_quantity - stock.available_quantity, 0)
            if total_quantity < borrowed_quantity:
                raise HttpError(400, f"Total quantity cannot be below borrowed quantity ({borrowed_quantity})")
            before = stock.available_quantity
            stock.total_quantity = total_quantity
            stock.available_quantity = total_quantity - borrowed_quantity
            stock.save()
            if stock.available_quantity != before:
                StockTransaction.objects.create(
                    item=item,
                    stock=stock,
                    transaction_type="ADJUST",
                    quantity_delta=stock.available_quantity - before,
                    available_before=before,
                    available_after=stock.available_quantity,
                    username=request.user.username if request.user.is_authenticated else "SYSTEM",
                    note="Manual quantity adjustment",
                )
    return {"message": "Item updated successfully"}

@api.delete("/items/{item_id}")
def delete_item(request, item_id: int):
    with transaction.atomic():
        item = Item.objects.select_for_update().get(id=item_id)
        item.status = "DELETED"
        item.save(update_fields=["status", "updated_at"])
        for stock in ItemStock.objects.select_for_update().filter(item=item):
            before = stock.available_quantity
            total_before = stock.total_quantity
            stock.total_quantity = 0
            stock.available_quantity = 0
            stock.save(update_fields=["total_quantity", "available_quantity", "updated_at"])
            if before != 0 or total_before != 0:
                StockTransaction.objects.create(
                    item=item,
                    stock=stock,
                    transaction_type="ADJUST",
                    quantity_delta=-before,
                    available_before=before,
                    available_after=0,
                    username=active_username(request),
                    note="Equipment soft-deleted; stock reset to zero",
                )
    return {"message": "Equipment has been deleted and stock quantity has been reset to zero."}


# --- ROOMS ---
@api.get("/rooms")
def get_rooms(request):
    return [
        {"id": r.id, "room_code": r.room_code, "room_name": r.room_name, "location": r.location}
        for r in Room.objects.all()
    ]

@api.post("/rooms")
def create_room(request, payload: RoomCreateUpdateSchema):
    room = Room.objects.create(**payload.dict())
    return {"id": room.id, "message": "Room created successfully"}

@api.put("/rooms/{room_id}")
def update_room(request, room_id: int, payload: RoomCreateUpdateSchema):
    room = Room.objects.get(id=room_id)
    for attr, value in payload.dict().items():
        setattr(room, attr, value)
    room.save()
    return {"message": "Room updated successfully"}

@api.delete("/rooms/{room_id}")
def delete_room(request, room_id: int):
    room = Room.objects.get(id=room_id)
    room.delete()
    return {"message": "Room deleted successfully"}


# --- BORROWERS ---
@api.get("/borrowers")
def get_borrowers(request, status: str | None = None, search: str | None = None):
    queryset = Borrower.objects.all()
    normalized_status = status.upper() if status else None
    if normalized_status in {"ACTIVE", "BLOCKED"}:
        queryset = queryset.filter(status=normalized_status)
    elif normalized_status == "ALL":
        pass
    elif normalized_status:
        raise HttpError(400, "Invalid borrower status filter")
    else:
        queryset = queryset.filter(status="ACTIVE")

    if search:
        queryset = queryset.filter(
            Q(full_name__icontains=search) |
            Q(borrower_code__icontains=search) |
            Q(email__icontains=search)
        )

    return [
        borrower_payload(b) for b in queryset.order_by("borrower_code")
    ]

@api.get("/borrowers/{borrower_code}/detail")
def borrower_full_detail(request, borrower_code: str):
    borrower = get_object_or_404(Borrower, borrower_code=borrower_code)
    return borrower_detail_payload(borrower)

@api.get("/borrowers/{borrower_code}")
def borrower_detail(request, borrower_code: str):
    borrower = Borrower.objects.get(borrower_code=borrower_code)
    return borrower_payload(borrower)

@api.post("/borrowers")
def create_borrower(request, payload: BorrowerCreateUpdateSchema):
    data = normalize_borrower_payload(payload.dict(), partial=False)
    if Borrower.objects.filter(borrower_code=data["borrower_code"]).exists():
        raise HttpError(400, "Student ID already exists")
    borrower = Borrower.objects.create(**data)
    return {
        "id": borrower.id,
        "student_id": borrower.borrower_code,
        "message": "Borrower created successfully",
    }

@api.put("/borrowers/id/{borrower_id}")
@api.put("/borrowers/{borrower_id}")
def update_borrower(request, borrower_id: int, payload: BorrowerCreateUpdateSchema):
    borrower = Borrower.objects.get(id=borrower_id)
    data = normalize_borrower_payload(payload.dict(), partial=False)
    if Borrower.objects.exclude(id=borrower_id).filter(borrower_code=data["borrower_code"]).exists():
        raise HttpError(400, "Student ID already exists")
    for attr, value in data.items():
        setattr(borrower, attr, value)
    borrower.save()
    sync_borrower_user(borrower)
    return {
        **borrower_payload(borrower),
        "message": "Borrower updated successfully",
    }

@api.patch("/borrowers/id/{borrower_id}")
@api.patch("/borrowers/{borrower_id}")
def patch_borrower(request, borrower_id: int, payload: BorrowerPatchSchema):
    borrower = Borrower.objects.get(id=borrower_id)
    data = normalize_borrower_payload(payload.dict(), partial=True)
    if "borrower_code" in data and Borrower.objects.exclude(id=borrower_id).filter(borrower_code=data["borrower_code"]).exists():
        raise HttpError(400, "Student ID already exists")
    for attr, value in data.items():
        setattr(borrower, attr, value)
    borrower.save()
    sync_borrower_user(borrower)
    return {
        **borrower_payload(borrower),
        "message": "Borrower updated successfully",
    }

@api.patch("/borrowers/{borrower_id}/status")
def update_borrower_status(request, borrower_id: int, payload: BorrowerStatusSchema):
    borrower = Borrower.objects.get(id=borrower_id)
    if payload.status not in {"ACTIVE", "BLOCKED"}:
        raise HttpError(400, "Invalid borrower status")
    previous_status = borrower.status
    borrower.status = payload.status
    borrower.save(update_fields=["status", "updated_at"])
    sync_borrower_user(borrower)
    if previous_status != payload.status:
        if payload.status == "BLOCKED":
            notify_borrower(borrower, "Account blocked", "Your borrower account has been blocked.")
        elif previous_status == "BLOCKED" and payload.status == "ACTIVE":
            notify_borrower(borrower, "Account unblocked", "Your borrower account has been unblocked.")
    return {
        "id": borrower.id,
        "borrower_code": borrower.borrower_code,
        "full_name": borrower.full_name,
        "status": borrower.status,
    }


# ==========================================
# 4. BUSINESS LOGIC APIs (Mượn trả, Kho bãi, Bảo trì)
# ==========================================

@api.get("/borrow-requests")
def get_all_requests(request):
    return [
        {
            "id": req.id,
            "borrower": req.borrower.full_name,
            "borrower_code": req.borrower.borrower_code,
            "request_date": req.request_date,
            "expected_return_date": req.expected_return_date,
            "status": req.status,
            "is_overdue": req.is_overdue,
            "items": [
                {
                    "borrow_item_id": item.id,
                    "item_id": item.item_id,
                    "item_name": item.item.item_name,
                    "requires_return": item.item.requires_return,
                    "equipment_id": item.item.equipment_id,
                    "purchase_price": item.item.purchase_price,
                    "quantity": item.quantity,
                    "status": item.status,
                }
                for item in req.items.select_related("item").all()
            ],
        }
        for req in BorrowRequest.objects.select_related("borrower").prefetch_related("items__item").all().order_by("-request_date")
    ]

@api.post("/borrow-requests")
def create_borrow_request(request, payload: BorrowRequestSchema):
    borrower = Borrower.objects.get(id=payload.borrower_id)
    if borrower.status != "ACTIVE":
        raise HttpError(400, "Borrower account is not active")
    try:
        expected_return_date = date.fromisoformat(payload.expected_return_date)
    except ValueError:
        raise HttpError(400, "Expected return date must be YYYY-MM-DD")
    today = date.today()
    max_return_date = today + timedelta(days=MAX_BORROW_DAYS)
    if expected_return_date < today:
        raise HttpError(400, "Expected return date cannot be in the past")
    if expected_return_date > max_return_date:
        raise HttpError(400, "Maximum borrowing duration is 5 months")
    borrow_request = BorrowRequest.objects.create(
        borrower=borrower,
        expected_return_date=expected_return_date,
        note=payload.note
    )
    return {"request_id": borrow_request.id, "status": borrow_request.status}

@api.post("/borrow-request-items")
def create_borrow_request_item(request, payload: BorrowRequestItemSchema):
    borrow_request = BorrowRequest.objects.get(id=payload.request_id)
    if borrow_request.status != "PENDING":
        raise HttpError(400, "Cannot add items to a processed request")
    item = Item.objects.get(id=payload.item_id)
    if item.status == "DELETED":
        raise HttpError(400, "Deleted equipment cannot be borrowed")
    available = ItemStock.objects.filter(item=item).aggregate(total=Sum("available_quantity"))["total"] or 0

    if available <= 0:
        raise HttpError(400, "Item is out of stock")
    if payload.quantity <= 0:
        raise HttpError(400, "Quantity must be greater than zero")
    if payload.quantity > available:
        raise HttpError(400, f"Requested quantity exceeds available stock. Available: {available}")

    borrow_item = BorrowRequestItem.objects.create(
        request=borrow_request,
        item=item,
        quantity=payload.quantity
    )
    return {"message": "Added successfully", "borrow_item_id": borrow_item.id}

@api.get("/borrow-requests/{request_id}")
def get_borrow_request(request, request_id: int):
    borrow_request = BorrowRequest.objects.get(id=request_id)
    items = [
        {
            "borrow_item_id": item.id,
            "item_name": item.item.item_name,
            "quantity": item.quantity,
            "status": item.status,
            "equipment_id": item.item.equipment_id,
            "purchase_price": item.item.purchase_price,
            "requires_return": item.item.requires_return,
        } for item in borrow_request.items.all()
    ]
    return {
        "id": borrow_request.id,
        "request_id": borrow_request.id,
        "borrower": borrow_request.borrower.full_name,
        "borrower_code": borrow_request.borrower.borrower_code,
        "request_date": borrow_request.request_date,
        "expected_return_date": borrow_request.expected_return_date,
        "status": borrow_request.status,
        "is_overdue": borrow_request.is_overdue,
        "items": items
    }

@api.post("/borrow-requests/{request_id}/approve")
def approve_request(request, request_id: int):
    username = active_username(request)
    with transaction.atomic():
        borrow_request = BorrowRequest.objects.select_for_update().get(id=request_id)
        if borrow_request.status != "PENDING":
            raise HttpError(400, f"Only PENDING requests can be approved. Current status: {borrow_request.status}")

        borrow_items = list(borrow_request.items.select_related("item").all())
        if not borrow_items:
            raise HttpError(400, "Request has no items")

        for borrow_item in borrow_items:
            if borrow_item.item.status == "DELETED":
                raise HttpError(400, f"Deleted equipment cannot be approved: {borrow_item.item.item_name}")
            available = ItemStock.objects.select_for_update().filter(item=borrow_item.item).aggregate(
                total=Sum("available_quantity")
            )["total"] or 0
            if available < borrow_item.quantity:
                raise HttpError(400, f"Not enough stock for {borrow_item.item.item_name}")

        for borrow_item in borrow_items:
            remaining = borrow_item.quantity
            for stock in ItemStock.objects.select_for_update().filter(item=borrow_item.item).order_by("id"):
                if remaining <= 0:
                    break
                deduct = min(stock.available_quantity, remaining)
                if deduct <= 0:
                    continue
                before = stock.available_quantity
                stock.available_quantity -= deduct
                stock.save(update_fields=["available_quantity", "updated_at"])
                StockTransaction.objects.create(
                    item=borrow_item.item,
                    stock=stock,
                    borrow_request=borrow_request,
                    borrow_item=borrow_item,
                    transaction_type="APPROVE",
                    quantity_delta=-deduct,
                    available_before=before,
                    available_after=stock.available_quantity,
                    username=username,
                    note=f"Approved request #{request_id}",
                )
                remaining -= deduct
            borrow_item.status = "COMPLETED" if not borrow_item.item.requires_return else "APPROVED"
            borrow_item.save(update_fields=["status", "updated_at"])
            if not borrow_item.item.requires_return:
                amount = borrow_item.item.purchase_price * borrow_item.quantity
                if amount > 0:
                    Debt.objects.create(
                        borrower=borrow_request.borrower,
                        borrow_item=borrow_item,
                        amount=amount,
                        reason=f"Payment request for {borrow_item.item.item_name}",
                        created_by=request.user if request.user.is_authenticated else None,
                    )
                    notify_borrower(
                        borrow_request.borrower,
                        "Yêu cầu thanh toán đã được tạo",
                        f"Yêu cầu thanh toán {amount} VNĐ đã được tạo cho {borrow_item.item.item_name}.",
                    )

        all_completed_on_approval = all(not borrow_item.item.requires_return for borrow_item in borrow_items)
        borrow_request.status = "COMPLETED" if all_completed_on_approval else "APPROVED"
        if all_completed_on_approval:
            for borrow_item in borrow_items:
                borrow_item.status = "COMPLETED"
                borrow_item.save(update_fields=["status", "updated_at"])
        borrow_request.save(update_fields=["status", "updated_at"])
        notify_borrower(
            borrow_request.borrower,
            "Request approved",
            f"Borrow request #{request_id} has been approved.",
        )
        if all_completed_on_approval:
            notify_borrower(
                borrow_request.borrower,
                "Request completed",
                f"Borrow request #{request_id} has been completed.",
            )
        AuditLog.objects.create(action=f"Approved request #{request_id}", username=username)
    return get_borrow_request(request, request_id)

@api.post("/borrow-requests/{request_id}/reject")
def reject_request(request, request_id: int):
    username = active_username(request)
    with transaction.atomic():
        borrow_request = BorrowRequest.objects.select_for_update().get(id=request_id)
        if borrow_request.status != "PENDING":
            raise HttpError(400, f"Only PENDING requests can be rejected. Current status: {borrow_request.status}")
        borrow_request.status = "REJECTED"
        borrow_request.save(update_fields=["status", "updated_at"])
        borrow_request.items.update(status="REJECTED")
        notify_borrower(
            borrow_request.borrower,
            "Request rejected",
            f"Borrow request #{request_id} has been rejected.",
        )
        AuditLog.objects.create(action=f"Rejected request #{request_id}", username=username)
    return get_borrow_request(request, request_id)

@api.post("/returns")
def return_item(request, payload: ReturnSchema):
    username = active_username(request)
    with transaction.atomic():
        borrow_request = BorrowRequest.objects.select_for_update().get(id=payload.request_id)
        borrow_item = BorrowRequestItem.objects.select_for_update().select_related("item").get(id=payload.borrow_item_id)
        if borrow_item.request_id != borrow_request.id:
            raise HttpError(400, "Borrow item does not belong to request")
        if borrow_request.status != "APPROVED":
            raise HttpError(400, "Only APPROVED requests can be returned")
        if not borrow_item.item.requires_return:
            raise HttpError(400, "This equipment is non-returnable and cannot be processed through returns")
        if borrow_item.status != "APPROVED":
            raise HttpError(400, "Only approved borrowed items can be returned")
        if payload.quantity <= 0:
            raise HttpError(400, "Returned quantity must be greater than zero")

        already_returned = ReturnRecordItem.objects.filter(borrow_item=borrow_item).aggregate(
            total=Sum("quantity")
        )["total"] or 0
        remaining_to_return = borrow_item.quantity - already_returned
        if payload.quantity > remaining_to_return:
            raise HttpError(400, "Returned quantity exceeds remaining borrowed quantity")

        return_record = ReturnRecord.objects.create(request=borrow_request, note=payload.note)
        payment_numerator, payment_denominator = condition_payment_rate(payload.returned_condition)
        payment_amount = (borrow_item.item.purchase_price * payload.quantity * payment_numerator) // payment_denominator

        ReturnRecordItem.objects.create(
            return_record=return_record,
            borrow_item=borrow_item,
            quantity=payload.quantity,
            returned_condition=payload.returned_condition,
            fine_amount=payment_amount
        )

        if payment_numerator < payment_denominator:
            stock = ItemStock.objects.select_for_update().filter(item=borrow_item.item).order_by("id").first()
            if not stock:
                room, _ = Room.objects.get_or_create(
                    room_code="MAIN",
                    defaults={"room_name": "Main Storage", "location": "Default"},
                )
                stock = ItemStock.objects.create(item=borrow_item.item, room=room, total_quantity=0, available_quantity=0)
            before = stock.available_quantity
            stock.available_quantity += payload.quantity
            if stock.available_quantity > stock.total_quantity:
                stock.total_quantity = stock.available_quantity
            stock.save(update_fields=["available_quantity", "total_quantity", "updated_at"])
            StockTransaction.objects.create(
                item=borrow_item.item,
                stock=stock,
                borrow_request=borrow_request,
                borrow_item=borrow_item,
                transaction_type="RETURN",
                quantity_delta=payload.quantity,
                available_before=before,
                available_after=stock.available_quantity,
                username=username,
                note=f"Returned request #{borrow_request.id}",
            )

        if payment_amount > 0:
            Debt.objects.create(
                borrower=borrow_request.borrower,
                borrow_item=borrow_item,
                amount=payment_amount,
                reason=payload.note or f"Payment request for {payload.returned_condition.lower()} return",
                created_by=request.user if request.user.is_authenticated else None,
            )
            notify_borrower(
                borrow_request.borrower,
                "Yêu cầu thanh toán đã được tạo",
                f"Yêu cầu thanh toán {payment_amount} VNĐ đã được tạo cho {borrow_item.item.item_name}.",
            )

        if already_returned + payload.quantity >= borrow_item.quantity:
            borrow_item.status = "COMPLETED"
            borrow_item.save(update_fields=["status", "updated_at"])

        all_completed = all(item.status == "COMPLETED" for item in borrow_request.items.all())
        if all_completed:
            borrow_request.status = "COMPLETED"
            borrow_request.is_overdue = False
            borrow_request.save(update_fields=["status", "is_overdue", "updated_at"])
            notify_borrower(
                borrow_request.borrower,
                "Request completed",
                f"Borrow request #{borrow_request.id} has been completed.",
            )
        AuditLog.objects.create(action=f"Returned item #{borrow_item.id} for request #{borrow_request.id}", username=username)

    return {"message": "Yêu cầu thanh toán đã được tạo thành công", "payment_amount": payment_amount, "request_status": borrow_request.status}

@api.get("/returns/pending")
def pending_returns(request):
    rows = []
    for item in BorrowRequestItem.objects.select_related("item", "request", "request__borrower").filter(
        request__status="APPROVED",
        status="APPROVED",
        item__requires_return=True,
    ).order_by("-request__request_date"):
        returned = ReturnRecordItem.objects.filter(borrow_item=item).aggregate(total=Sum("quantity"))["total"] or 0
        remaining = item.quantity - returned
        if remaining <= 0:
            continue
        rows.append({
            "request_id": item.request_id,
            "borrow_item_id": item.id,
            "borrower": item.request.borrower.full_name,
            "borrower_code": item.request.borrower.borrower_code,
            "equipment_id": item.item.equipment_id,
            "item_id": item.item_id,
            "item_name": item.item.item_name,
            "purchase_price": item.item.purchase_price,
            "quantity": item.quantity,
            "remaining_quantity": remaining,
            "expected_return_date": item.request.expected_return_date,
        })
    return rows

@api.get("/stocks")
def get_stocks(request):
    return [
        {
            "item": stock.item.item_name,
            "room": stock.room.room_name,
            "total": stock.total_quantity,
            "available": stock.available_quantity
        } for stock in ItemStock.objects.filter(item__status="ACTIVE")
    ]

@api.get("/items/available")
def available_items(request):
    return [
        {"item_id": stock.item.id, "item_name": stock.item.item_name, "available_quantity": stock.available_quantity}
        for stock in ItemStock.objects.filter(item__status="ACTIVE", available_quantity__gt=0)
    ]

@api.get("/stocks/low")
def low_stock_items(request):
    result = []
    for stock in ItemStock.objects.filter(item__status="ACTIVE"):
        if stock.available_quantity <= stock.item.minimum_quantity:
            result.append({
                "item": stock.item.item_name,
                "room": stock.room.room_name,
                "available": stock.available_quantity,
                "minimum": stock.item.minimum_quantity
            })
    return result

@api.post("/stocks/check")
def check_stock(request):
    created = 0
    for stock in ItemStock.objects.filter(item__status="ACTIVE"):
        if stock.available_quantity <= stock.item.minimum_quantity:
            Notification.objects.create(
                title="Low Stock Alert",
                content=f"{stock.item.item_name} only has {stock.available_quantity} items left"
            )
            created += 1
    return {"notifications_created": created}

@api.get("/borrow-requests/overdue")
def overdue_requests(request):
    today = date.today()
    return [
        {
            "request_id": req.id,
            "borrower": req.borrower.full_name,
            "expected_return_date": req.expected_return_date,
            "is_overdue": req.is_overdue,
        }
        for req in BorrowRequest.objects.filter(expected_return_date__lt=today, status="APPROVED")
    ]

@api.post("/borrow-requests/check-overdue")
def check_overdue(request):
    """Hợp nhất logic từ 3 hàm trùng tên thành một luồng xử lý đồng bộ tối ưu."""
    today = date.today()
    overdue_requests = BorrowRequest.objects.filter(expected_return_date__lt=today, status="APPROVED")
    created = 0
    for req in overdue_requests:
        if not req.is_overdue:
            req.is_overdue = True
            req.overdue_notified_at = timezone.now()
            req.save(update_fields=["is_overdue", "overdue_notified_at", "updated_at"])
            notify_borrower(
                req.borrower,
                "Equipment overdue",
                f"Borrow request #{req.id} is overdue since {req.expected_return_date}.",
            )
            AuditLog.objects.create(action=f"Request #{req.id} became overdue", username="SYSTEM")
            created += 1
    return {"updated_overdue_requests": created, "overdue_total": overdue_requests.count()}

@api.get("/borrowers/{borrower_code}/borrowed-items")
def borrower_borrowed_items(request, borrower_code: str):
    borrower = get_object_or_404(Borrower, borrower_code=borrower_code)
    rows = []
    for item in BorrowRequestItem.objects.select_related("item", "request").filter(
        request__borrower=borrower,
        request__status="APPROVED",
        status="APPROVED",
        item__requires_return=True,
    ):
        returned = ReturnRecordItem.objects.filter(borrow_item=item).aggregate(total=Sum("quantity"))["total"] or 0
        remaining = item.quantity - returned
        if remaining > 0:
            rows.append({
                "borrow_item_id": item.id,
                "request_id": item.request_id,
                "item_id": item.item_id,
                "equipment_id": item.item.equipment_id,
                "item_name": item.item.item_name,
                "purchase_price": item.item.purchase_price,
                "requires_return": item.item.requires_return,
                "quantity": item.quantity,
                "remaining_quantity": remaining,
            })
    return rows

@api.get("/payment-requests")
def get_payment_requests(request):
    return [
        {
            "id": debt.id,
            "borrower": debt.borrower.full_name,
            "borrower_code": debt.borrower.borrower_code,
            "borrow_item_id": debt.borrow_item_id,
            "item": debt.borrow_item.item.item_name,
            "amount": debt.amount,
            "reason": debt.reason,
            "status": debt.status,
            "created_at": debt.created_at,
        } for debt in Debt.objects.select_related("borrower", "borrow_item__item").all().order_by("-created_at")
    ]

@api.delete("/payment-requests/{debt_id}")
def mark_payment_request_paid(request, debt_id: int):
    debt = get_object_or_404(Debt.objects.select_related("borrower", "borrow_item__item"), id=debt_id)
    debt.mark_paid()
    notify_borrower(
        debt.borrower,
        "Debt paid",
        f"Công nợ #{debt.id} cho {debt.borrow_item.item.item_name} đã được đánh dấu là đã thanh toán.",
    )
    return {"message": "Công nợ đã được đánh dấu là đã thanh toán", "id": debt.id, "status": debt.status}

@api.get("/payment-requests/summary")
def payment_request_summary(request):
    total = sum(debt.amount for debt in Debt.objects.filter(status="UNPAID"))
    return {
        "total_payment_request_amount": total,
        "records": Debt.objects.filter(status="UNPAID").count()
    }

@api.get("/maintenance/due")
def due_maintenance(request):
    today = date.today()
    result = []
    for r in MaintenanceRecord.objects.filter(next_maintenance_date__lte=today):
        overdue_days = (today - r.next_maintenance_date).days
        result.append({
            "item": r.item.item_name,
            "maintenance_date": r.maintenance_date,
            "next_maintenance_date": r.next_maintenance_date,
            "cost": r.cost,
            "overdue_days": overdue_days
        })
    return result

@api.get("/maintenance/stats")
def maintenance_stats(request):
    today = date.today()
    return {
        "total_records": MaintenanceRecord.objects.count(),
        "due_now": MaintenanceRecord.objects.filter(next_maintenance_date__lte=today).count(),
        "total_cost": sum(r.cost for r in MaintenanceRecord.objects.all())
    }


# ==========================================
# 5. NOTIFICATION APIs (Thông báo)
# ==========================================

@api.get("/notifications")
def get_notifications(request):
    return [
        {"id": n.id, "title": n.title, "content": n.content, "is_read": n.is_read, "created_at": n.created_at}
        for n in Notification.objects.all()
    ]

@api.post("/notifications")
def create_notification(request, payload: NotificationCreateSchema):
    borrower = Borrower.objects.get(borrower_code=payload.borrower_code)
    notification = Notification.objects.create(
        borrower=borrower, title=payload.title, content=payload.content
    )
    return {"id": notification.id, "message": "Notification created"}

@api.get("/borrowers/{borrower_code}/notifications")
def borrower_notifications(request, borrower_code: str):
    borrower = Borrower.objects.get(borrower_code=borrower_code)
    return [
        {"title": n.title, "content": n.content, "is_read": n.is_read}
        for n in Notification.objects.filter(borrower=borrower)
    ]

@api.post("/notifications/{notification_id}/read")
def mark_notification_read(request, notification_id: int):
    notification = Notification.objects.get(id=notification_id)
    notification.is_read = True
    notification.save()
    return {"message": "Notification marked as read"}

@api.get("/notifications/unread-count")
def unread_count(request):
    return {"unread_notifications": Notification.objects.filter(is_read=False).count()}

@api.get("/notifications/stats")
def notification_stats(request):
    return {
        "total": Notification.objects.count(),
        "read": Notification.objects.filter(is_read=True).count(),
        "unread": Notification.objects.filter(is_read=False).count()
    }


# ==========================================
# 6. DASHBOARDS & REPORTS APIs (Báo cáo thống kê)
# ==========================================

@api.get("/borrowers/{borrower_code}/debt")
def borrower_debt(request, borrower_code: str):
    borrower = Borrower.objects.get(borrower_code=borrower_code)
    total_debt = sum(debt.amount for debt in Debt.objects.filter(borrower=borrower, status="UNPAID"))
    return {"borrower_code": borrower.borrower_code, "borrower_name": borrower.full_name, "total_debt": total_debt}

@api.get("/borrowers/{borrower_code}/history")
def borrower_history(request, borrower_code: str):
    borrower = Borrower.objects.get(borrower_code=borrower_code)
    history = []
    for req in BorrowRequest.objects.filter(borrower=borrower):
        for item in req.items.all():
            history.append({
                "request_id": req.id,
                "request_date": req.request_date,
                "expected_return_date": req.expected_return_date,
                "item_name": item.item.item_name,
                "quantity": item.quantity,
                "status": item.status,
                "borrow_request_status": req.status
            })
    return history

@api.get("/dashboard-v2")
def dashboard_v2(request):
    today = date.today()
    return {
        "items": Item.objects.count(),
        "borrowers": Borrower.objects.count(),
        "active_borrowers": Borrower.objects.filter(status="ACTIVE").count(),
        "borrowed_items": BorrowRequestItem.objects.filter(request__status="APPROVED", status="APPROVED").aggregate(total=Sum("quantity"))["total"] or 0,
        "active_borrowings": BorrowRequest.objects.filter(status="APPROVED").count(),
        "pending_requests": BorrowRequest.objects.filter(status="PENDING").count(),
        "overdue": BorrowRequest.objects.filter(status="APPROVED", expected_return_date__lt=today).count(),
        "overdue_persisted": BorrowRequest.objects.filter(is_overdue=True, status="APPROVED").count(),
        "notifications": Notification.objects.count(),
        "unread_notifications": Notification.objects.filter(is_read=False).count(),
        "maintenance_due": MaintenanceRecord.objects.filter(next_maintenance_date__lte=today).count(),
        "total_payment_request_amount": sum(debt.amount for debt in Debt.objects.filter(status="UNPAID")),
        "outstanding_debts": Debt.objects.filter(status="UNPAID").count(),
    }

@api.get("/dashboard/summary")
def dashboard_summary(request):
    return {
        "categories": Category.objects.count(),
        "items": Item.objects.count(),
        "suppliers": Supplier.objects.count(),
        "rooms": Room.objects.count(),
        "borrowers": Borrower.objects.count(),
        "stocks": ItemStock.objects.count(),
        "notifications": Notification.objects.count()
    }

@api.get("/dashboard/admin")
def admin_dashboard(request):
    today = date.today()
    return {
        "total_items": Item.objects.count(),
        "total_rooms": Room.objects.count(),
        "total_suppliers": Supplier.objects.count(),
        "total_borrowers": Borrower.objects.count(),
        "active_loans": BorrowRequest.objects.filter(status="APPROVED").count(),
        "overdue_loans": BorrowRequest.objects.filter(status="APPROVED", expected_return_date__lt=today).count()
    }

@api.get("/dashboard/kpi")
def dashboard_kpi(request):
    total_val = sum(stock.total_quantity * stock.item.purchase_price for stock in ItemStock.objects.all())
    return {
        "inventory_value": total_val,
        "total_payment_request_amount": sum(debt.amount for debt in Debt.objects.filter(status="UNPAID")),
        "borrow_requests": BorrowRequest.objects.count(),
        "active_loans": BorrowRequest.objects.filter(status="APPROVED").count()
    }

@api.get("/reports/top-items")
def top_items(request):
    data = {}
    for item in BorrowRequestItem.objects.all():
        name = item.item.item_name
        data[name] = data.get(name, 0) + item.quantity
    result = [{"item": name, "borrowed_quantity": qty} for name, qty in data.items()]
    result.sort(key=lambda x: x["borrowed_quantity"], reverse=True)
    return result

@api.get("/reports/top-borrowers-v2")
def top_borrowers_v2(request):
    result = []
    for borrower in Borrower.objects.all():
        total = sum(item.quantity for req in BorrowRequest.objects.filter(borrower=borrower) for item in req.items.all())
        result.append({"borrower_code": borrower.borrower_code, "borrower_name": borrower.full_name, "total_borrowed": total})
    result.sort(key=lambda x: x["total_borrowed"], reverse=True)
    return result

@api.get("/reports/inventory-value")
def inventory_value(request):
    total_value = 0
    details = []
    for stock in ItemStock.objects.all():
        value = stock.total_quantity * stock.item.purchase_price
        total_value += value
        details.append({
            "item": stock.item.item_name,
            "quantity": stock.total_quantity,
            "unit_price": stock.item.purchase_price,
            "value": value
        })
    return {"total_inventory_value": total_value, "details": details}

@api.get("/reports/maintenance-cost")
def maintenance_cost(request):
    return {"total_maintenance_cost": sum(record.cost for record in MaintenanceRecord.objects.all())}

@api.get("/reports/category-summary")
def category_summary(request):
    return [
        {"category": cat.name, "total_items": Item.objects.filter(category=cat).count()}
        for cat in Category.objects.all()
    ]

@api.get("/reports/room-summary")
def room_summary(request):
    return [
        {"room": rm.room_name, "total_items": sum(stock.total_quantity for stock in ItemStock.objects.filter(room=rm))}
        for rm in Room.objects.all()
    ]

@api.get("/reports/never-borrowed")
def never_borrowed(request):
    borrowed_ids = BorrowRequestItem.objects.values_list("item_id", flat=True).distinct()
    return [
        {"item_code": item.item_code, "item_name": item.item_name}
        for item in Item.objects.exclude(id__in=borrowed_ids)
    ]

@api.get("/reports/most-popular-item")
def most_popular_item(request):
    data = {}
    for item in BorrowRequestItem.objects.all():
        data[item.item.item_name] = data.get(item.item.item_name, 0) + item.quantity
    if not data:
        return {"message": "No borrow records"}
    best_item = max(data, key=data.get)
    return {"item": best_item, "borrowed_quantity": data[best_item]}

@api.get("/reports/room-inventory-value")
def room_inventory_value(request):
    result = []
    for room in Room.objects.all():
        val = sum(s.total_quantity * s.item.purchase_price for s in ItemStock.objects.filter(room=room))
        result.append({"room": room.room_name, "inventory_value": val})
    return result

@api.get("/reports/supplier-summary")
def supplier_summary(request):
    return [
        {"supplier": sup.supplier_name, "items": Item.objects.filter(supplier=sup).count()}
        for sup in Supplier.objects.all()
    ]

@api.get("/reports/user-roles")
def user_roles(request):
    return {
        "admins": UserProfile.objects.filter(role="ADMIN").count(),
        "staff": UserProfile.objects.filter(role="STAFF").count(),
        "borrowers": UserProfile.objects.filter(role="BORROWER").count()
    }

@api.get("/reports/top-debtors")
def top_debtors(request):
    data = {}
    for debt in Debt.objects.filter(status="UNPAID").select_related("borrower"):
        name = debt.borrower.full_name
        data[name] = data.get(name, 0) + debt.amount
    result = [{"borrower": name, "debt": debt} for name, debt in data.items()]
    result.sort(key=lambda x: x["debt"], reverse=True)
    return result[:5]

@api.get("/reports/debtors")
def report_debtors(request):
    result = []
    for b in Borrower.objects.all():
        total = sum(f.amount for f in Debt.objects.filter(borrower=b, status="UNPAID"))
        if total > 0:
            result.append({"borrower_code": b.borrower_code, "borrower_name": b.full_name, "debt": total})
    result.sort(key=lambda x: x["debt"], reverse=True)
    return result

@api.get("/reports/summary")
def report_summary(request):
    return {
        "items": Item.objects.count(),
        "borrowers": Borrower.objects.count(),
        "requests": BorrowRequest.objects.count(),
        "returns": ReturnRecord.objects.count(),
        "notifications": Notification.objects.count(),
        "maintenance": MaintenanceRecord.objects.count()
    }


# ==========================================
# 7. SYSTEM LOGS & MONITORING APIs (Giám sát hệ thống)
# ==========================================

@api.get("/system/health")
def system_health(request):
    return {
        "categories": Category.objects.count(),
        "items": Item.objects.count(),
        "suppliers": Supplier.objects.count(),
        "borrowers": Borrower.objects.count(),
        "borrow_requests": BorrowRequest.objects.count(),
        "notifications": Notification.objects.count(),
        "maintenance_records": MaintenanceRecord.objects.count()
    }

@api.get("/system/audit-logs")
def audit_logs(request):
    return [
        {"action": log.action, "username": log.username, "created_at": log.created_at}
        for log in AuditLog.objects.all().order_by("-created_at")
    ]

@api.get("/system/activities/recent")
def recent_activities(request):
    return [
        {"action": log.action, "username": log.username, "created_at": log.created_at}
        for log in AuditLog.objects.all().order_by("-created_at")[:10]
    ]

@api.get("/system/search")
def global_search(request, keyword: str):
    items = Item.objects.filter(item_name__icontains=keyword)
    borrowers = Borrower.objects.filter(full_name__icontains=keyword)
    return {
        "items": [item.item_name for item in items],
        "borrowers": [b.full_name for b in borrowers]
    }
