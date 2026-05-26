from datetime import date

from django.db import migrations


def seed_events(apps, schema_editor):
    Association = apps.get_model("associations", "Association")
    AssociationEvent = apps.get_model("associations", "AssociationEvent")

    year = date.today().year
    defaults = [
        ("Ársreikningur", "Senda út ársreikning a.m.k. tveimur vikum fyrir aðalfund.", "STATEMENT", date(year, 4, 15)),
        ("Aðalfundur", "Aðalfundur húsfélags skal haldinn ár hvert fyrir lok aprílmánaðar.", "MEETING", date(year, 4, 30)),
        ("Búa til áætlun", "Undirbúa fjárhagsáætlun fyrir næsta ár.", "BUDGET", date(year, 12, 10)),
    ]

    for association in Association.objects.all():
        if AssociationEvent.objects.filter(association=association).exists():
            continue
        AssociationEvent.objects.bulk_create([
            AssociationEvent(
                association=association, title=t, description=d,
                event_type=et, event_date=dt, visibility="ALL", reminder_days=None,
            )
            for (t, d, et, dt) in defaults
        ])


def unseed(apps, schema_editor):
    # Default-seeded events are indistinguishable from user-created ones after the
    # fact; leave them in place on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("associations", "0035_associationevent"),
    ]

    operations = [
        migrations.RunPython(seed_events, unseed),
    ]
