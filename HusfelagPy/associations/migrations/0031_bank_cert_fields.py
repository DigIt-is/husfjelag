from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("associations", "0030_apartment_fnr_max_length"),
    ]

    operations = [
        # BankTokenCache: add client_id, drop the id=1 singleton assumption,
        # add unique_together so each (bank, client_id) has exactly one token row.
        migrations.AddField(
            model_name="banktokencache",
            name="client_id",
            field=models.CharField(max_length=256, default=""),
        ),
        migrations.AlterUniqueTogether(
            name="banktokencache",
            unique_together={("bank", "client_id")},
        ),

        # AssociationBankSettings: add bank provider, api_key, last_sync_at.
        # template_id stays but becomes blank=True (Landsbankinn-specific).
        migrations.AddField(
            model_name="associationbanksettings",
            name="bank",
            field=models.CharField(
                max_length=32,
                choices=[
                    ("landsbankinn", "Landsbankinn"),
                    ("islandsbanki", "Íslandsbanki"),
                    ("arion", "Arion"),
                ],
                default="landsbankinn",
            ),
        ),
        migrations.AddField(
            model_name="associationbanksettings",
            name="api_key",
            field=models.CharField(max_length=256, blank=True, default=""),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="associationbanksettings",
            name="last_sync_at",
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AlterField(
            model_name="associationbanksettings",
            name="template_id",
            field=models.CharField(max_length=64, blank=True, default=""),
            preserve_default=False,
        ),
    ]
