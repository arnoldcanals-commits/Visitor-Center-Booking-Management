import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

app = Celery("backend")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.conf.beat_schedule = {
    "reject-pending-bookings-after-start": {
        "task": "api.tasks.reject_pending_bookings_after_start",
        "schedule": 60.0,
    }
}

app.autodiscover_tasks()