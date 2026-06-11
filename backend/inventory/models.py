from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


vn_phone_validator = RegexValidator(
    regex=r"^(03|05|07|08|09)\d{8}$",
    message="Phone number must be exactly 10 digits and start with 03, 05, 07, 08, or 09.",
)


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimeStampedModel):
    name = models.CharField(
        max_length=100
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    def __str__(self):
        return self.name

class Supplier(TimeStampedModel):
    supplier_name = models.CharField(max_length=150)

    contact_name = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    phone = models.CharField(
        max_length=15,
        blank=True,
        null=True
    )

    email = models.EmailField(
        blank=True,
        null=True
    )

    address = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    def __str__(self):
        return self.supplier_name

class Item(TimeStampedModel):
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("DELETED", "Deleted"),
    ]

    equipment_id = models.CharField(
        max_length=50,
        unique=True
    )

    item_code = models.CharField(
        max_length=50,
        unique=True
    )

    item_name = models.CharField(
        max_length=150
    )

    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE
    )

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    unit = models.CharField(
        max_length=20
    )

    requires_return = models.BooleanField(
        default=True
    )

    minimum_quantity = models.IntegerField(
        default=0
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    documentation_url = models.URLField(
        blank=True,
        null=True
    )
    
    purchase_price = models.BigIntegerField(
        default=0
    )

    rental_price = models.BigIntegerField(
        default=0
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE",
        db_index=True,
    )

    def __str__(self):
        return self.item_name
    
class Room(TimeStampedModel):  
    room_code = models.CharField(
        max_length=50,
        unique=True
    )

    room_name = models.CharField(
        max_length=100
    )

    location = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    def __str__(self):
        return self.room_name
    
class Borrower(TimeStampedModel):
    BORROWER_TYPES = [
        ("STUDENT", "Student"),
        ("LECTURER", "Lecturer"),
        ("RESEARCHER", "Researcher"),
        ("EXTERNAL", "External"),
    ]

    # Cập nhật lại 3 trạng thái rõ ràng tại đây
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),        # Đang hoạt động bình thường
        ("BLOCKED", "Blocked"),      # Bị khóa quyền mượn đồ (vẫn đăng nhập được)
        ("DELETED", "Deleted"),      # Đã bị xóa mềm (không cho đăng nhập nữa)
    ]

    borrower_code = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=100)
    borrower_type = models.CharField(max_length=20, choices=BORROWER_TYPES)
    department = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    phone_number = models.CharField(max_length=10, blank=True, null=True, validators=[vn_phone_validator])
    date_of_birth = models.DateField(blank=True, null=True)
    faculty = models.CharField(max_length=120, blank=True, null=True)
    major = models.CharField(max_length=120, blank=True, null=True)
    class_name = models.CharField(max_length=80, blank=True, null=True)
    academic_year = models.CharField(max_length=20, blank=True, null=True)
    study_status = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")

    def __str__(self):
        return f"{self.borrower_code} - {self.full_name}"
    
class BorrowRequest(TimeStampedModel):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("COMPLETED", "Completed"),
    ]

    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE
    )

    request_date = models.DateTimeField(
        auto_now_add=True
    )

    expected_return_date = models.DateField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    note = models.TextField(
        blank=True,
        null=True
    )

    is_overdue = models.BooleanField(default=False)

    overdue_notified_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Request #{self.id}"

class BorrowRequestItem(TimeStampedModel):
    request = models.ForeignKey(
        BorrowRequest,
        on_delete=models.CASCADE,
        related_name="items"
    )

    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE
    )

    quantity = models.PositiveIntegerField(
        default=1
    )

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("COMPLETED", "Completed"),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="borrow_request_item_quantity_gt_0"),
        ]

    def __str__(self):
        return f"{self.item.item_name} ({self.quantity})"

class ReturnRecord(TimeStampedModel):
    request = models.ForeignKey(
        BorrowRequest,
        on_delete=models.CASCADE
    )

    return_date = models.DateTimeField(
        auto_now_add=True
    )

    note = models.TextField(
        blank=True,
        null=True
    )

class ReturnRecordItem(TimeStampedModel):

    CONDITION_CHOICES = [
        ("GOOD", "Good"),
        ("DAMAGED", "Damaged"),
        ("BROKEN", "Broken"),
        ("LOST", "Lost"),
    ]

    return_record = models.ForeignKey(
        ReturnRecord,
        on_delete=models.CASCADE
    )

    borrow_item = models.ForeignKey(
        BorrowRequestItem,
        on_delete=models.CASCADE
    )

    quantity = models.IntegerField()

    returned_condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES
    )

    fine_amount = models.BigIntegerField(
        default=0
    )

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="return_record_item_quantity_gt_0"),
            models.CheckConstraint(condition=Q(fine_amount__gte=0), name="return_record_item_fine_gte_0"),
        ]


class MaintenanceRecord(TimeStampedModel):

    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE
    )

    maintenance_date = models.DateField()

    next_maintenance_date = models.DateField()

    cost = models.BigIntegerField(
        default=0
    )

    note = models.TextField(
        blank=True,
        null=True
    )

class ItemStock(TimeStampedModel):

    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE
    )

    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE
    )

    total_quantity = models.PositiveIntegerField(
        default=0
    )

    available_quantity = models.PositiveIntegerField(
        default=0
    )

    class Meta:
        unique_together = ("room", "item")
        indexes = [
            models.Index(fields=["item", "room"]),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(total_quantity__gte=0), name="item_stock_total_gte_0"),
            models.CheckConstraint(condition=Q(available_quantity__gte=0), name="item_stock_available_gte_0"),
            models.CheckConstraint(
                condition=Q(available_quantity__lte=models.F("total_quantity")),
                name="item_stock_available_lte_total",
            ),
        ]

    def __str__(self):
        return f"{self.room.room_name} - {self.item.item_name}"


class StockTransaction(TimeStampedModel):
    TRANSACTION_TYPES = [
        ("APPROVE", "Approve"),
        ("RETURN", "Return"),
        ("ADJUST", "Adjust"),
    ]

    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    stock = models.ForeignKey(ItemStock, on_delete=models.CASCADE, null=True, blank=True)
    borrow_request = models.ForeignKey(BorrowRequest, on_delete=models.SET_NULL, null=True, blank=True)
    borrow_item = models.ForeignKey(BorrowRequestItem, on_delete=models.SET_NULL, null=True, blank=True)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity_delta = models.IntegerField()
    available_before = models.PositiveIntegerField()
    available_after = models.PositiveIntegerField()
    note = models.TextField(blank=True, null=True)
    username = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["item", "created_at"]),
            models.Index(fields=["transaction_type", "created_at"]),
        ]

    def __str__(self):
        return f"{self.transaction_type} {self.item.item_name} ({self.quantity_delta})"


class Debt(TimeStampedModel):
    STATUS_CHOICES = [
        ("UNPAID", "Unpaid"),
        ("PAID", "Paid"),
    ]

    borrower = models.ForeignKey(Borrower, on_delete=models.CASCADE)
    borrow_item = models.ForeignKey(BorrowRequestItem, on_delete=models.PROTECT)
    amount = models.BigIntegerField()
    reason = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="UNPAID")
    paid_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_debts",
    )

    class Meta:
        indexes = [
            models.Index(fields=["borrower", "status"]),
            models.Index(fields=["borrow_item"]),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(amount__gt=0), name="debt_amount_gt_0"),
        ]

    def mark_paid(self):
        self.status = "PAID"
        self.paid_at = timezone.now()
        self.save(update_fields=["status", "paid_at", "updated_at"])

    def __str__(self):
        return f"{self.borrower.borrower_code} - {self.borrow_item.item.item_name} - {self.amount}"
    

class Notification(TimeStampedModel):

    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    title = models.CharField(
        max_length=200
    )

    content = models.TextField()

    is_read = models.BooleanField(
        default=False
    )

    def __str__(self):
        return self.title
    
class UserProfile(TimeStampedModel):

    ROLE_CHOICES = [
        ("ADMIN", "Admin"),
        ("STAFF", "Staff"),
        ("BORROWER", "Borrower"),
    ]

    user = models.OneToOneField(
        "auth.User",
        on_delete=models.CASCADE
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES
    )

    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.role}"
    
class AuditLog(TimeStampedModel):

    action = models.CharField(
        max_length=200
    )

    username = models.CharField(
        max_length=100
    )
