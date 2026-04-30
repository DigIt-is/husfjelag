from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("associations", "0025_seed_extra_accounting_keys"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="association",
            name="board_changed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="association",
            name="board_changed_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="board_changes",
                to="users.user",
            ),
        ),
    ]
