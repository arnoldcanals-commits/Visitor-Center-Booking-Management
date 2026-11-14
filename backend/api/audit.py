from contextlib import contextmanager
from contextvars import ContextVar

from django.contrib.contenttypes.models import ContentType
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import AuditLog


_current_actor = ContextVar("audit_actor", default=None)


def get_current_actor():
    return _current_actor.get()


@contextmanager
def audit_actor(actor):
    token = _current_actor.set(actor if getattr(actor, "is_authenticated", False) else None)
    try:
        yield
    finally:
        _current_actor.reset(token)


def record_audit(instance, action, changes=None, actor=None):
    if instance.pk is None:
        raise ValueError("Cannot audit an unsaved model instance.")

    audit_user = actor if actor is not None else get_current_actor()
    if not getattr(audit_user, "is_authenticated", False):
        audit_user = None

    audit_changes = dict(changes or {})
    if audit_user is None:
        audit_changes["actor"] = "System"
    else:
        audit_changes["actor"] = (
            getattr(audit_user, "username", None) or audit_user.get_username()
        )

    return AuditLog.objects.create(
        user=audit_user,
        content_type=ContentType.objects.get_for_model(
            instance, for_concrete_model=False
        ),
        object_id=str(instance.pk),
        action=action,
        changes=audit_changes,
    )


class AuditJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        authenticated = super().authenticate(request)
        if authenticated is not None:
            _current_actor.set(authenticated[0])
        return authenticated


class AuditActorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        with audit_actor(getattr(request, "user", None)):
            return self.get_response(request)


class AuditActorMixin:
    def dispatch(self, request, *args, **kwargs):
        with audit_actor(getattr(request, "user", None)):
            return super().dispatch(request, *args, **kwargs)
