from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_auditlog_add_association"),
    ]

    operations = [
        migrations.AlterField(
            model_name="auditlog",
            name="action",
            field=models.CharField(
                choices=[
                    ("login", "Login"),
                    ("chair_changed", "Chair changed"),
                    ("cfo_changed", "CFO changed"),
                    ("association_new", "Association created"),
                    ("budget_new", "Budget created"),
                    ("owner_new", "Owner added"),
                    ("event_new", "Event created"),
                ],
                max_length=32,
            ),
        ),
    ]
