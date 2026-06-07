from django.db import models

class Category(models.Model):
    name = models.CharField(
        max_length=100
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    def __str__(self):
        return self.name

class Supplier(models.Model):
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

class Item(models.Model):

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
    
    purchase_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    rental_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    def __str__(self):
        return self.item_name
    
class Room(models.Model):  
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
    
class Borrower(models.Model):
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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="ACTIVE")

    def __str__(self):
        return f"{self.borrower_code} - {self.full_name}"
    
class BorrowRequest(models.Model):

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
        ("BORROWED", "Borrowed"),
        ("RETURNED", "Returned"),
        ("OVERDUE", "Overdue"),
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

    def __str__(self):
        return f"Request #{self.id}"

class BorrowRequestItem(models.Model):
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
        ("BORROWED", "Borrowed"),
        ("RETURNED", "Returned"),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PENDING"
    )

    def __str__(self):
        return f"{self.item.item_name} ({self.quantity})"

class ReturnRecord(models.Model):
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

class ReturnRecordItem(models.Model):

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

    fine_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

class MaintenanceRecord(models.Model):

    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE
    )

    maintenance_date = models.DateField()

    next_maintenance_date = models.DateField()

    cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    note = models.TextField(
        blank=True,
        null=True
    )

class ItemStock(models.Model):

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

    def __str__(self):
        return f"{self.room.room_name} - {self.item.item_name}"
    
class Notification(models.Model):

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

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    is_read = models.BooleanField(
        default=False
    )

    def __str__(self):
        return self.title
    
class UserProfile(models.Model):

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
    
class AuditLog(models.Model):

    action = models.CharField(
        max_length=200
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    username = models.CharField(
        max_length=100
    )