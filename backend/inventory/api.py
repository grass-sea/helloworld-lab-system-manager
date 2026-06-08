from ninja import NinjaAPI, Schema
from ninja.errors import HttpError
from datetime import date
from decimal import Decimal
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
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

# ==========================================
# 1. SCHEMAS (MÔ HÌNH DỮ LIỆU ĐẦU VÀO)
# ==========================================

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
    item_code: str
    item_name: str
    category_id: int
    supplier_id: int | None = None
    unit: str
    requires_return: bool = True
    minimum_quantity: int = 0
    description: str | None = None
    purchase_price: float = 0.0
    rental_price: float = 0.0
    total_quantity: int | None = None

class RoomCreateUpdateSchema(Schema):
    room_code: str
    room_name: str
    location: str | None = None

class BorrowerCreateUpdateSchema(Schema):
    borrower_code: str
    full_name: str
    borrower_type: str  # STUDENT, LECTURER, RESEARCHER, EXTERNAL
    department: str | None = None
    email: str | None = None
    phone: str | None = None
    status: str = "ACTIVE"  # ACTIVE, BLACKLISTED, INACTIVE

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

class NotificationCreateSchema(Schema):
    borrower_code: str
    title: str
    content: str

class DebtCreateSchema(Schema):
    borrower_code: str
    borrow_item_id: int
    amount: float
    reason: str | None = None

class BorrowerStatusSchema(Schema):
    status: str


# ==========================================
# 2. AUTHENTICATION & USER APIs (Xác thực & Người dùng)
# ==========================================

@api.post("/auth/register")
def register(request, payload: RegisterSchema):
    if User.objects.filter(username=payload.username).exists():
        return {"success": False, "message": "Username already exists"}

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
    if profile.borrower and profile.borrower.status == "DELETED":
        return {"success": False, "code": "ACCOUNT_DISABLED", "message": "Account disabled"}
    if profile.borrower and profile.borrower.status == "BLOCKED":
        return {"success": False, "code": "ACCOUNT_DISABLED", "message": "Account disabled"}
    django_login(request, user)
    return {
        "success": True,
        "message": "Login successful",
        "username": user.username,
        "email": user.email,
        "full_name": profile.borrower.full_name if profile.borrower else user.get_full_name(),
        "role": profile.role,
        "borrower_code": profile.borrower.borrower_code if profile.borrower else None,
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
    return {
        "authenticated": True,
        "username": user.username,
        "email": user.email,
        "full_name": profile.borrower.full_name if profile.borrower else user.get_full_name(),
        "role": profile.role,
        "borrower_code": profile.borrower.borrower_code if profile.borrower else None,
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
    for item in Item.objects.select_related("category").all():
        totals = ItemStock.objects.filter(item=item).aggregate(
            total=Sum("total_quantity"),
            available=Sum("available_quantity"),
        )
        result.append({
            "id": item.id,
            "code": item.item_code,
            "name": item.item_name,
            "category": item.category.name,
            "total_quantity": totals["total"] or 0,
            "available_quantity": totals["available"] or 0,
        })
    return result

@api.get("/items/search")
def search_items(request, keyword: str):
    items = Item.objects.filter(item_name__icontains=keyword)
    return [{"id": item.id, "name": item.item_name} for item in items]

@api.get("/items/{item_id}")
def item_detail(request, item_id: int):
    item = Item.objects.get(id=item_id)
    return {
        "id": item.id,
        "item_code": item.item_code,
        "item_name": item.item_name,
        "category": item.category.name,
        "supplier": item.supplier.supplier_name if item.supplier else None,
        "purchase_price": float(item.purchase_price),
        "rental_price": float(item.rental_price),
        "minimum_quantity": item.minimum_quantity,
        "requires_return": item.requires_return
    }

@api.post("/items")
def create_item(request, payload: ItemCreateUpdateSchema):
    data = payload.dict()
    category_id = data.pop("category_id")
    supplier_id = data.pop("supplier_id", None)
    total_quantity = data.pop("total_quantity", None)
    
    category = Category.objects.get(id=category_id)
    supplier = Supplier.objects.get(id=supplier_id) if supplier_id else None
    
    with transaction.atomic():
        item = Item.objects.create(category=category, supplier=supplier, **data)
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
    category_id = data.pop("category_id")
    supplier_id = data.pop("supplier_id", None)
    total_quantity = data.pop("total_quantity", None)
    
    with transaction.atomic():
        item.category = Category.objects.get(id=category_id)
        item.supplier = Supplier.objects.get(id=supplier_id) if supplier_id else None
        
        for attr, value in data.items():
            setattr(item, attr, value)
        item.save()
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
    item = Item.objects.get(id=item_id)
    item.delete()
    return {"message": "Item deleted successfully"}


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
def get_borrowers(request):
    return [
        {
            "id": b.id,
            "borrower_code": b.borrower_code,
            "full_name": b.full_name,
            "borrower_type": b.borrower_type,
            "status": b.status
        } for b in Borrower.objects.all()
    ]

@api.get("/borrowers/{borrower_code}")
def borrower_detail(request, borrower_code: str):
    borrower = Borrower.objects.get(borrower_code=borrower_code)
    return {
        "id": borrower.id,
        "borrower_code": borrower.borrower_code,
        "full_name": borrower.full_name,
        "borrower_type": borrower.borrower_type,
        "email": borrower.email,
        "phone": borrower.phone,
        "status": borrower.status
    }

@api.post("/borrowers")
def create_borrower(request, payload: BorrowerCreateUpdateSchema):
    borrower = Borrower.objects.create(**payload.dict())
    return {"id": borrower.id, "message": "Borrower created successfully"}

@api.put("/borrowers/{borrower_id}")
def update_borrower(request, borrower_id: int, payload: BorrowerCreateUpdateSchema):
    borrower = Borrower.objects.get(id=borrower_id)
    for attr, value in payload.dict().items():
        setattr(borrower, attr, value)
    borrower.save()
    return {"message": "Borrower updated successfully"}

@api.patch("/borrowers/{borrower_id}/status")
def update_borrower_status(request, borrower_id: int, payload: BorrowerStatusSchema):
    borrower = Borrower.objects.get(id=borrower_id)
    if payload.status not in dict(Borrower.STATUS_CHOICES):
        raise HttpError(400, "Invalid borrower status")
    borrower.status = payload.status
    borrower.save(update_fields=["status", "updated_at"])
    return {
        "id": borrower.id,
        "borrower_code": borrower.borrower_code,
        "full_name": borrower.full_name,
        "status": borrower.status,
    }

@api.delete("/borrowers/{borrower_id}")
def delete_borrower(request, borrower_id: int):
    borrower = Borrower.objects.get(id=borrower_id)
    borrower.delete()
    return {"message": "Borrower deleted successfully"}


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
            "items": [
                {
                    "borrow_item_id": item.id,
                    "item_id": item.item_id,
                    "item_name": item.item.item_name,
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
    borrow_request = BorrowRequest.objects.create(
        borrower=borrower,
        expected_return_date=payload.expected_return_date,
        note=payload.note
    )
    return {"request_id": borrow_request.id, "status": borrow_request.status}

@api.post("/borrow-request-items")
def create_borrow_request_item(request, payload: BorrowRequestItemSchema):
    borrow_request = BorrowRequest.objects.get(id=payload.request_id)
    if borrow_request.status != "PENDING":
        raise HttpError(400, "Cannot add items to a processed request")
    item = Item.objects.get(id=payload.item_id)
    available = ItemStock.objects.filter(item=item).aggregate(total=Sum("available_quantity"))["total"] or 0

    if available <= 0:
        return {"error": "Item not found in stock"}
    if payload.quantity <= 0:
        raise HttpError(400, "Quantity must be greater than zero")
    if payload.quantity > available:
        return {"error": f"Only {available} items available"}

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
            "purchase_price": float(item.item.purchase_price)
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
        "items": items
    }

@api.post("/borrow-requests/{request_id}/approve")
def approve_request(request, request_id: int):
    username = request.user.username if request.user.is_authenticated else "SYSTEM"
    with transaction.atomic():
        borrow_request = BorrowRequest.objects.select_for_update().get(id=request_id)
        if borrow_request.status != "PENDING":
            raise HttpError(400, f"Only PENDING requests can be approved. Current status: {borrow_request.status}")

        borrow_items = list(borrow_request.items.select_related("item").all())
        if not borrow_items:
            raise HttpError(400, "Request has no items")

        for borrow_item in borrow_items:
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
            borrow_item.status = "APPROVED"
            borrow_item.save(update_fields=["status", "updated_at"])

        borrow_request.status = "APPROVED"
        borrow_request.save(update_fields=["status", "updated_at"])
        AuditLog.objects.create(action=f"Approved request #{request_id}", username=username)
    return get_borrow_request(request, request_id)

@api.post("/borrow-requests/{request_id}/reject")
def reject_request(request, request_id: int):
    username = request.user.username if request.user.is_authenticated else "SYSTEM"
    with transaction.atomic():
        borrow_request = BorrowRequest.objects.select_for_update().get(id=request_id)
        if borrow_request.status != "PENDING":
            raise HttpError(400, f"Only PENDING requests can be rejected. Current status: {borrow_request.status}")
        borrow_request.status = "REJECTED"
        borrow_request.save(update_fields=["status", "updated_at"])
        borrow_request.items.update(status="REJECTED")
        AuditLog.objects.create(action=f"Rejected request #{request_id}", username=username)
    return get_borrow_request(request, request_id)

@api.post("/returns")
def return_item(request, payload: ReturnSchema):
    username = request.user.username if request.user.is_authenticated else "SYSTEM"
    with transaction.atomic():
        borrow_request = BorrowRequest.objects.select_for_update().get(id=payload.request_id)
        borrow_item = BorrowRequestItem.objects.select_for_update().select_related("item").get(id=payload.borrow_item_id)
        if borrow_item.request_id != borrow_request.id:
            raise HttpError(400, "Borrow item does not belong to request")
        if borrow_request.status != "APPROVED":
            raise HttpError(400, "Only APPROVED requests can be returned")
        if payload.quantity <= 0:
            raise HttpError(400, "Returned quantity must be greater than zero")

        already_returned = ReturnRecordItem.objects.filter(borrow_item=borrow_item).aggregate(
            total=Sum("quantity")
        )["total"] or 0
        remaining_to_return = borrow_item.quantity - already_returned
        if payload.quantity > remaining_to_return:
            raise HttpError(400, "Returned quantity exceeds remaining borrowed quantity")

        return_record = ReturnRecord.objects.create(request=borrow_request)
        fine = Decimal("0")
        if payload.returned_condition == "DAMAGED":
            fine = borrow_item.item.purchase_price * Decimal("0.3")
        elif payload.returned_condition == "BROKEN":
            fine = borrow_item.item.purchase_price * Decimal("0.7")
        elif payload.returned_condition == "LOST":
            fine = borrow_item.item.purchase_price

        ReturnRecordItem.objects.create(
            return_record=return_record,
            borrow_item=borrow_item,
            quantity=payload.quantity,
            returned_condition=payload.returned_condition,
            fine_amount=fine
        )

        if payload.returned_condition != "LOST":
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

        if fine > 0:
            Debt.objects.create(
                borrower=borrow_request.borrower,
                borrow_item=borrow_item,
                amount=fine,
                reason=f"Auto fine for {payload.returned_condition.lower()} return",
                created_by=request.user if request.user.is_authenticated else None,
            )

        if already_returned + payload.quantity >= borrow_item.quantity:
            borrow_item.status = "COMPLETED"
            borrow_item.save(update_fields=["status", "updated_at"])

        all_completed = all(item.status == "COMPLETED" for item in borrow_request.items.all())
        if all_completed:
            borrow_request.status = "COMPLETED"
            borrow_request.save(update_fields=["status", "updated_at"])

    return {"message": "Return success", "fine_amount": float(fine), "request_status": borrow_request.status}

@api.get("/stocks")
def get_stocks(request):
    return [
        {
            "item": stock.item.item_name,
            "room": stock.room.room_name,
            "total": stock.total_quantity,
            "available": stock.available_quantity
        } for stock in ItemStock.objects.all()
    ]

@api.get("/items/available")
def available_items(request):
    return [
        {"item_id": stock.item.id, "item_name": stock.item.item_name, "available_quantity": stock.available_quantity}
        for stock in ItemStock.objects.filter(available_quantity__gt=0)
    ]

@api.get("/stocks/low")
def low_stock_items(request):
    result = []
    for stock in ItemStock.objects.all():
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
    for stock in ItemStock.objects.all():
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
        {"request_id": req.id, "borrower": req.borrower.full_name, "expected_return_date": req.expected_return_date}
        for req in BorrowRequest.objects.filter(expected_return_date__lt=today, status="APPROVED")
    ]

@api.post("/borrow-requests/check-overdue")
def check_overdue(request):
    """Hợp nhất logic từ 3 hàm trùng tên thành một luồng xử lý đồng bộ tối ưu."""
    today = date.today()
    overdue_requests = BorrowRequest.objects.filter(expected_return_date__lt=today, status="APPROVED")
    created = 0
    for req in overdue_requests:
        Notification.objects.create(
            borrower=req.borrower,
            title="Overdue Borrowing",
            content=f"Borrow request #{req.id} is overdue since {req.expected_return_date}"
        )
        AuditLog.objects.create(action=f"Request #{req.id} became overdue", username="SYSTEM")
        created += 1
    return {"updated_overdue_requests": created}

@api.get("/borrowers/{borrower_code}/borrowed-items")
def borrower_borrowed_items(request, borrower_code: str):
    borrower = get_object_or_404(Borrower, borrower_code=borrower_code)
    rows = []
    for item in BorrowRequestItem.objects.select_related("item", "request").filter(
        request__borrower=borrower,
        request__status="APPROVED",
        status="APPROVED",
    ):
        returned = ReturnRecordItem.objects.filter(borrow_item=item).aggregate(total=Sum("quantity"))["total"] or 0
        remaining = item.quantity - returned
        if remaining > 0:
            rows.append({
                "borrow_item_id": item.id,
                "request_id": item.request_id,
                "item_id": item.item_id,
                "item_name": item.item.item_name,
                "quantity": item.quantity,
                "remaining_quantity": remaining,
            })
    return rows

@api.get("/fines")
def get_fines(request):
    return [
        {
            "id": debt.id,
            "borrower": debt.borrower.full_name,
            "borrower_code": debt.borrower.borrower_code,
            "borrow_item_id": debt.borrow_item_id,
            "item": debt.borrow_item.item.item_name,
            "fine": float(debt.amount),
            "reason": debt.reason,
            "status": debt.status,
            "created_at": debt.created_at,
        } for debt in Debt.objects.select_related("borrower", "borrow_item__item").filter(status="UNPAID")
    ]

@api.post("/fines")
def create_fine(request, payload: DebtCreateSchema):
    borrower = get_object_or_404(Borrower, borrower_code=payload.borrower_code)
    borrow_item = get_object_or_404(
        BorrowRequestItem.objects.select_related("request", "item"),
        id=payload.borrow_item_id,
        request__borrower=borrower,
        request__status="APPROVED",
    )
    if borrow_item.status != "APPROVED":
        raise HttpError(400, "Debt can only be created for currently borrowed items")
    if payload.amount <= 0:
        raise HttpError(400, "Debt amount must be greater than zero")
    debt = Debt.objects.create(
        borrower=borrower,
        borrow_item=borrow_item,
        amount=Decimal(str(payload.amount)),
        reason=payload.reason or "Manual fine",
        created_by=request.user if request.user.is_authenticated else None,
    )
    return {
        "id": debt.id,
        "borrower": borrower.full_name,
        "borrower_code": borrower.borrower_code,
        "borrow_item_id": borrow_item.id,
        "item": borrow_item.item.item_name,
        "fine": float(debt.amount),
        "reason": debt.reason,
        "status": debt.status,
    }

@api.delete("/fines/{fine_id}")
def mark_fine_paid(request, fine_id: int):
    debt = get_object_or_404(Debt, id=fine_id)
    debt.mark_paid()
    return {"message": "Fine marked as paid", "id": debt.id, "status": debt.status}

@api.get("/fines/summary")
def fine_summary(request):
    total = sum(debt.amount for debt in Debt.objects.filter(status="UNPAID"))
    return {
        "total_fines": float(total),
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
            "cost": float(r.cost),
            "overdue_days": overdue_days
        })
    return result

@api.get("/maintenance/stats")
def maintenance_stats(request):
    today = date.today()
    return {
        "total_records": MaintenanceRecord.objects.count(),
        "due_now": MaintenanceRecord.objects.filter(next_maintenance_date__lte=today).count(),
        "total_cost": float(sum(r.cost for r in MaintenanceRecord.objects.all()))
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
    return {"borrower_code": borrower.borrower_code, "borrower_name": borrower.full_name, "total_debt": float(total_debt)}

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
        "active_borrowings": BorrowRequest.objects.filter(status="APPROVED").count(),
        "pending_requests": BorrowRequest.objects.filter(status="PENDING").count(),
        "overdue": BorrowRequest.objects.filter(status="APPROVED", expected_return_date__lt=today).count(),
        "notifications": Notification.objects.count(),
        "maintenance_due": MaintenanceRecord.objects.filter(next_maintenance_date__lte=today).count(),
        "total_fines": float(sum(debt.amount for debt in Debt.objects.filter(status="UNPAID")))
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
        "inventory_value": float(total_val),
        "total_fines": float(sum(f.amount for f in Debt.objects.filter(status="UNPAID"))),
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
            "unit_price": float(stock.item.purchase_price),
            "value": float(value)
        })
    return {"total_inventory_value": float(total_value), "details": details}

@api.get("/reports/maintenance-cost")
def maintenance_cost(request):
    return {"total_maintenance_cost": float(sum(record.cost for record in MaintenanceRecord.objects.all()))}

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
        result.append({"room": room.room_name, "inventory_value": float(val)})
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
    for fine in Debt.objects.filter(status="UNPAID").select_related("borrower"):
        name = fine.borrower.full_name
        data[name] = data.get(name, 0) + float(fine.amount)
    result = [{"borrower": name, "debt": debt} for name, debt in data.items()]
    result.sort(key=lambda x: x["debt"], reverse=True)
    return result[:5]

@api.get("/reports/debtors")
def report_debtors(request):
    result = []
    for b in Borrower.objects.all():
        total = sum(f.amount for f in Debt.objects.filter(borrower=b, status="UNPAID"))
        if total > 0:
            result.append({"borrower_code": b.borrower_code, "borrower_name": b.full_name, "debt": float(total)})
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
