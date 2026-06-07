from ninja import NinjaAPI, Schema
from datetime import date
from django.contrib.auth import authenticate
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
    Supplier,
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


# ==========================================
# 2. AUTHENTICATION & USER APIs (Xác thực & Người dùng)
# ==========================================

@api.get("/auth/me")
def get_user_info(request):
    if not request.user.is_authenticated:
        return {"error": "Unauthorized"}, 401
    
    profile = UserProfile.objects.get(user=request.user)
    return {
        "username": request.user.username,
        "full_name": request.user.full_name + " " + request.user.last_name,
        "role": request.user.role_id.role_name if request.user.role_id else "STUDENT"
    }

@api.post("/auth/register")
def register(request, payload: RegisterSchema):
    if User.objects.filter(username=payload.username).exists():
        return {"success": False, "message": "Username already exists"}
    
    # Tạo user kèm mật khẩu đã băm hóa bảo mật
    user = User.objects.create_user(
        username=payload.username,
        password=payload.password,
        email=payload.email
    )
    
    borrower = None
    if payload.borrower_code:
        borrower = Borrower.objects.filter(borrower_code=payload.borrower_code).first()
        
    UserProfile.objects.create(user=user, role=payload.role, borrower=borrower)
    return {"success": True, "message": "User registered successfully"}

@api.post("/auth/login")
def login(request, payload: LoginSchema):
    user = authenticate(username=payload.username, password=payload.password)
    if not user:
        return {"success": False, "message": "Invalid username or password"}
    profile = user.userprofile
    return {"success": True, "username": user.username, "role": profile.role}

@api.get("/auth/me")
def me(request):
    user = request.user
    if not user.is_authenticated:
        return {"authenticated": False}
    profile = user.userprofile
    return {"username": user.username, "role": profile.role}

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
    return [
        {
            "id": item.id,
            "code": item.item_code,
            "name": item.item_name,
            "category": item.category.name,
        }
        for item in Item.objects.all()
    ]

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
    
    category = Category.objects.get(id=category_id)
    supplier = Supplier.objects.get(id=supplier_id) if supplier_id else None
    
    item = Item.objects.create(category=category, supplier=supplier, **data)
    return {"id": item.id, "message": "Item created successfully"}

@api.put("/items/{item_id}")
def update_item(request, item_id: int, payload: ItemCreateUpdateSchema):
    item = Item.objects.get(id=item_id)
    data = payload.dict()
    category_id = data.pop("category_id")
    supplier_id = data.pop("supplier_id", None)
    
    item.category = Category.objects.get(id=category_id)
    item.supplier = Supplier.objects.get(id=supplier_id) if supplier_id else None
    
    for attr, value in data.items():
        setattr(item, attr, value)
    item.save()
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
        {"id": req.id, "borrower": req.borrower.full_name, "request_date": req.request_date, "status": req.status}
        for req in BorrowRequest.objects.all()
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
    item = Item.objects.get(id=payload.item_id)
    stock = ItemStock.objects.filter(item=item).first()

    if not stock:
        return {"error": "Item not found in stock"}
    if payload.quantity > stock.available_quantity:
        return {"error": f"Only {stock.available_quantity} items available"}

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
        "request_id": borrow_request.id,
        "borrower": borrow_request.borrower.full_name,
        "status": borrow_request.status,
        "items": items
    }

@api.post("/borrow-requests/{request_id}/approve")
def approve_request(request, request_id: int):
    borrow_request = BorrowRequest.objects.get(id=request_id)

    for borrow_item in borrow_request.items.all():
        stock = ItemStock.objects.filter(item=borrow_item.item).first()
        if not stock:
            return {"error": f"{borrow_item.item.item_name} not found in stock"}
        if stock.available_quantity < borrow_item.quantity:
            return {"error": f"Not enough stock for {borrow_item.item.item_name}"}

    for borrow_item in borrow_request.items.all():
        stock = ItemStock.objects.filter(item=borrow_item.item).first()
        stock.available_quantity -= borrow_item.quantity
        stock.save()
        borrow_item.status = "BORROWED"
        borrow_item.save()

    borrow_request.status = "BORROWED"
    borrow_request.save()

    AuditLog.objects.create(action=f"Approved request #{request_id}", username="SYSTEM")
    return {"message": "Request approved successfully"}

@api.post("/returns")
def return_item(request, payload: ReturnSchema):
    borrow_request = BorrowRequest.objects.get(id=payload.request_id)
    borrow_item = BorrowRequestItem.objects.get(id=payload.borrow_item_id)
    
    if payload.quantity > borrow_item.quantity:
        return {"error": "Returned quantity exceeds borrowed quantity"}

    return_record = ReturnRecord.objects.create(request=borrow_request)
    fine = 0
    if payload.returned_condition == "DAMAGED":
        fine = borrow_item.item.purchase_price * 0.3
    elif payload.returned_condition == "BROKEN":
        fine = borrow_item.item.purchase_price * 0.7
    elif payload.returned_condition == "LOST":
        fine = borrow_item.item.purchase_price

    ReturnRecordItem.objects.create(
        return_record=return_record,
        borrow_item=borrow_item,
        quantity=payload.quantity,
        returned_condition=payload.returned_condition,
        fine_amount=fine
    )

    if payload.returned_condition == "GOOD":
        stock = ItemStock.objects.filter(item=borrow_item.item).first()
        if stock:
            stock.available_quantity += payload.quantity
            stock.save()

    borrow_item.status = "RETURNED"
    borrow_item.save()

    all_returned = all(item.status == "RETURNED" for item in borrow_request.items.all())
    if all_returned:
        borrow_request.status = "RETURNED"
        borrow_request.save()

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
        for req in BorrowRequest.objects.filter(expected_return_date__lt=today, status="BORROWED")
    ]

@api.post("/borrow-requests/check-overdue")
def check_overdue(request):
    """Hợp nhất logic từ 3 hàm trùng tên thành một luồng xử lý đồng bộ tối ưu."""
    today = date.today()
    overdue_requests = BorrowRequest.objects.filter(expected_return_date__lt=today, status="BORROWED")
    created = 0
    for req in overdue_requests:
        Notification.objects.create(
            borrower=req.borrower,
            title="Overdue Borrowing",
            content=f"Borrow request #{req.id} is overdue since {req.expected_return_date}"
        )
        req.status = "OVERDUE"
        req.save()
        AuditLog.objects.create(action=f"Request #{req.id} became overdue", username="SYSTEM")
        created += 1
    return {"updated_overdue_requests": created}

@api.get("/fines")
def get_fines(request):
    return [
        {
            "borrower": item.borrow_item.request.borrower.full_name,
            "item": item.borrow_item.item.item_name,
            "fine": float(item.fine_amount)
        } for item in ReturnRecordItem.objects.filter(fine_amount__gt=0)
    ]

@api.get("/fines/summary")
def fine_summary(request):
    total = sum(fine.fine_amount for fine in ReturnRecordItem.objects.all())
    return {
        "total_fines": float(total),
        "records": ReturnRecordItem.objects.filter(fine_amount__gt=0).count()
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
    total_debt = sum(
        fine.fine_amount for fine in ReturnRecordItem.objects.all()
        if fine.borrow_item.request.borrower.borrower_code == borrower_code
    )
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
        "active_borrowings": BorrowRequest.objects.filter(status="BORROWED").count(),
        "overdue": BorrowRequest.objects.filter(status="OVERDUE").count(),
        "notifications": Notification.objects.count(),
        "maintenance_due": MaintenanceRecord.objects.filter(next_maintenance_date__lte=today).count(),
        "total_fines": float(sum(item.fine_amount for item in ReturnRecordItem.objects.all()))
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
    return {
        "total_items": Item.objects.count(),
        "total_rooms": Room.objects.count(),
        "total_suppliers": Supplier.objects.count(),
        "total_borrowers": Borrower.objects.count(),
        "active_loans": BorrowRequest.objects.filter(status="BORROWED").count(),
        "overdue_loans": BorrowRequest.objects.filter(status="OVERDUE").count()
    }

@api.get("/dashboard/kpi")
def dashboard_kpi(request):
    total_val = sum(stock.total_quantity * stock.item.purchase_price for stock in ItemStock.objects.all())
    return {
        "inventory_value": float(total_val),
        "total_fines": float(sum(f.fine_amount for f in ReturnRecordItem.objects.all())),
        "borrow_requests": BorrowRequest.objects.count(),
        "active_loans": BorrowRequest.objects.filter(status="BORROWED").count()
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
    for fine in ReturnRecordItem.objects.all():
        name = fine.borrow_item.request.borrower.full_name
        data[name] = data.get(name, 0) + float(fine.fine_amount)
    result = [{"borrower": name, "debt": debt} for name, debt in data.items()]
    result.sort(key=lambda x: x["debt"], reverse=True)
    return result[:5]

@api.get("/reports/debtors")
def report_debtors(request):
    result = []
    for b in Borrower.objects.all():
        total = sum(f.fine_amount for f in ReturnRecordItem.objects.all() if f.borrow_item.request.borrower == b)
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