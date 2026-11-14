from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0010_alter_guest_unique_together_and_more"),
        ("billing", "0003_feetype_created_at_feetype_deleted_at_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="billitem",
            name="item_type",
            field=models.CharField(
                choices=[
                    ("guest", "Guest Charge"),
                    ("fee", "Additional Fee"),
                    ("activity", "Activity"),
                ],
                default="guest",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="billitem",
            name="activity",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="billing_items",
                to="api.activity",
            ),
        ),
        migrations.AddConstraint(
            model_name="billitem",
            constraint=models.UniqueConstraint(
                condition=models.Q(item_type="activity"),
                fields=("bill", "booking_guest", "activity"),
                name="uniq_bill_guest_activity",
            ),
        ),
    ]
