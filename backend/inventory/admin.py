from django.contrib import admin
from django.utils.html import format_html
from .models import *

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "role",
        "borrower",
    )

    list_filter = (
        "role",
    )

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("id", "supplier_name", "phone", "email")
    search_fields = ("supplier_name",)


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "item_code",
        "item_name",
        "category",
        "requires_return",
        "purchase_price",
        "rental_price",
    )
    search_fields = ("item_name", "item_code")
    list_filter = ("requires_return", "category")


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("id", "room_code", "room_name")


@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = (
        "borrower_code",
        "full_name",
        "borrower_type",
        "status",
    )
    search_fields = (
        "borrower_code",
        "full_name",
    )


@admin.register(BorrowRequest)
class BorrowRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "borrower",
        "colored_status",  
        "request_date",
        "expected_return_date",
    )

    list_filter = (
        "status",
    )

    search_fields = (
        "borrower__full_name",
        "borrower__borrower_code",
    )
    
    def colored_status(self, obj):
        colors = {
            "PENDING": "orange",
            "BORROWED": "blue",
            "RETURNED": "green",
            "REJECTED": "red",
        }
        color = colors.get(obj.status, "black")
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display() if hasattr(obj, 'get_status_display') else obj.status
        )
    
    colored_status.short_description = "Status"

@admin.register(BorrowRequestItem)
class BorrowRequestItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "request",
        "item",
        "quantity",
        "status",
    )


@admin.register(ReturnRecord)
class ReturnRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "request",
        "return_date",
    )


@admin.register(ReturnRecordItem)
class ReturnRecordItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "borrow_item",
        "quantity",
        "returned_condition",
        "payment_amount",
    )

    @admin.display(description="Payment amount")
    def payment_amount(self, obj):
        return obj.fine_amount


@admin.register(MaintenanceRecord)
class MaintenanceRecordAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "item",
        "maintenance_date",
        "next_maintenance_date",
        "cost",
    )

@admin.register(ItemStock)
class ItemStockAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "room",
        "item",
        "total_quantity",
        "available_quantity",
    )

    list_filter = (
        "room",
    )

    search_fields = (
        "item__item_name",
    )

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "is_read",
        "created_at",
    )

    list_filter = (
        "is_read",
    )

    search_fields = (
        "title",
    )

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "action",
        "username",
        "created_at",
    )

    search_fields = (
        "action",
        "username",
    )
