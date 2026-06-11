import inventory.models
from django.db import migrations, models


def populate_equipment_ids(apps, schema_editor):
    Item = apps.get_model("inventory", "Item")
    used = set()
    for item in Item.objects.all().order_by("id"):
        base = (item.item_code or f"EQ-{item.id}").strip() or f"EQ-{item.id}"
        equipment_id = base
        suffix = 1
        while equipment_id in used or Item.objects.exclude(id=item.id).filter(equipment_id=equipment_id).exists():
            suffix += 1
            equipment_id = f"{base}-{suffix}"
        item.equipment_id = equipment_id
        item.save(update_fields=["equipment_id"])
        used.add(equipment_id)


def populate_phone_numbers(apps, schema_editor):
    Borrower = apps.get_model("inventory", "Borrower")
    for borrower in Borrower.objects.all():
        phone = borrower.phone or ""
        if len(phone) == 10 and phone[:2] in {"03", "05", "07", "08", "09"} and phone.isdigit():
            borrower.phone_number = phone
            borrower.save(update_fields=["phone_number"])


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0004_borrowrequest_is_overdue_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="item",
            name="equipment_id",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="borrower",
            name="date_of_birth",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="borrower",
            name="phone_number",
            field=models.CharField(
                blank=True,
                max_length=10,
                null=True,
                validators=[inventory.models.vn_phone_validator],
            ),
        ),
        migrations.RunPython(populate_equipment_ids, migrations.RunPython.noop),
        migrations.RunPython(populate_phone_numbers, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="item",
            name="equipment_id",
            field=models.CharField(max_length=50, unique=True),
        ),
        migrations.AlterField(
            model_name="item",
            name="purchase_price",
            field=models.BigIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="item",
            name="rental_price",
            field=models.BigIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="debt",
            name="amount",
            field=models.BigIntegerField(),
        ),
        migrations.AlterField(
            model_name="returnrecorditem",
            name="fine_amount",
            field=models.BigIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name="maintenancerecord",
            name="cost",
            field=models.BigIntegerField(default=0),
        ),
    ]
