"""
Encrypt AssociationBankSettings.api_key at rest and restructure BankTokenCache
to key rows by association FK instead of plaintext client_id.

BankTokenCache rows are just cached OAuth tokens — safe to clear; they are
refetched automatically on the next API call.
"""
from django.db import migrations, models
import django.db.models.deletion


def encrypt_existing_api_keys(apps, schema_editor):
    AssociationBankSettings = apps.get_model("associations", "AssociationBankSettings")
    from associations.models import _get_fernet
    fernet = _get_fernet()
    for obj in AssociationBankSettings.objects.exclude(api_key=""):
        try:
            # Skip if already encrypted (Fernet tokens start with "gAAAAA")
            if obj.api_key.startswith("gAAAAA"):
                continue
            obj.api_key = fernet.encrypt(obj.api_key.encode()).decode()
            obj.save(update_fields=["api_key"])
        except Exception:
            pass


class Migration(migrations.Migration):

    dependencies = [
        ("associations", "0036_seed_default_events"),
    ]

    operations = [
        # 1. Clear the token cache — rows are ephemeral, will be refetched automatically
        migrations.RunSQL("DELETE FROM associations_banktokencache;", migrations.RunSQL.noop),

        # 2. Remove old unique constraint and client_id column
        migrations.AlterUniqueTogether(
            name="banktokencache",
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name="banktokencache",
            name="client_id",
        ),

        # 3. Add association FK
        migrations.AddField(
            model_name="banktokencache",
            name="association",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="bank_token_caches",
                to="associations.association",
                null=True,
            ),
        ),
        migrations.AlterUniqueTogether(
            name="banktokencache",
            unique_together={("bank", "association")},
        ),

        # 4. Change api_key to TextField (encrypted values are longer than 256 chars)
        migrations.AlterField(
            model_name="associationbanksettings",
            name="api_key",
            field=models.TextField(blank=True),
        ),

        # 5. Encrypt existing plaintext api_key values
        migrations.RunPython(encrypt_existing_api_keys, migrations.RunPython.noop),
    ]
