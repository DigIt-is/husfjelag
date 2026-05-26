from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_auditlog_add_association"),
        ("associations", "0034_category_is_default"),
    ]

    operations = [
        migrations.CreateModel(
            name="AssociationEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            ("MEETING", "Fundur"),
                            ("STATEMENT", "Ársreikningur"),
                            ("BUDGET", "Áætlun"),
                            ("COLLECTION", "Innheimta"),
                            ("OTHER", "Annað"),
                        ],
                        default="OTHER",
                        max_length=16,
                    ),
                ),
                ("event_date", models.DateField()),
                ("event_time", models.TimeField(blank=True, null=True)),
                (
                    "visibility",
                    models.CharField(
                        choices=[("ALL", "Allir"), ("BOARD", "Stjórn")],
                        default="ALL",
                        max_length=8,
                    ),
                ),
                ("reminder_days", models.IntegerField(blank=True, null=True)),
                ("reminder_sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("deleted", models.BooleanField(default=False)),
                (
                    "association",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="associations.association",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_events",
                        to="users.user",
                    ),
                ),
            ],
            options={
                "db_table": "associations_associationevent",
                "ordering": ["event_date", "event_time"],
            },
        ),
    ]
