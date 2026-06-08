from django.db import migrations


def normalize_statuses(apps, schema_editor):
    BorrowRequest = apps.get_model("inventory", "BorrowRequest")
    BorrowRequestItem = apps.get_model("inventory", "BorrowRequestItem")

    BorrowRequest.objects.filter(status="BORROWED").update(status="APPROVED")
    BorrowRequest.objects.filter(status="RETURNED").update(status="COMPLETED")
    BorrowRequest.objects.filter(status="OVERDUE").update(status="APPROVED")

    BorrowRequestItem.objects.filter(status="BORROWED").update(status="APPROVED")
    BorrowRequestItem.objects.filter(status="RETURNED").update(status="COMPLETED")


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0002_debt_stocktransaction_auditlog_updated_at_and_more"),
    ]

    operations = [
        migrations.RunPython(normalize_statuses, migrations.RunPython.noop),
    ]
