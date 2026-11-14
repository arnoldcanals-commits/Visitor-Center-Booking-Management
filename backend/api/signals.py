import json

from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.signals import m2m_changed, post_save, pre_delete, pre_save
from django.dispatch import receiver

from .audit import record_audit
from .models import AuditLog, BaseModel, Booking, Notification, User, Review, Permit

# Helper to notify all staff/admins
def notify_staff(title, message, booking=None):
    staff_members = User.objects.filter(role__in=['admin', 'staff'])
    for staff in staff_members:
        Notification.objects.create(
            user=staff,
            notification_type="booking",
            title=title,
            message=message,
            related_booking=booking
        )


_AUDIT_EXCLUDED_FIELDS = {
    "id",
    "created_at",
    "updated_at",
    "deleted_at",
    "last_login",
}
_AUDIT_EXCLUDED_MODELS = {"api.auditlog", "api.notification"}
_AUDIT_EXTRA_MODELS = {
    "api.dashboardhero",
    "api.dashboardimage",
    "billing.bill",
    "billing.billitem",
    "billing.billtemplate",
}


def _is_audited_model(sender):
    label = sender._meta.label_lower
    if label in _AUDIT_EXCLUDED_MODELS:
        return False
    return issubclass(sender, BaseModel) or label in _AUDIT_EXTRA_MODELS


def _auditable_fields(sender):
    return [
        field
        for field in sender._meta.concrete_fields
        if field.name not in _AUDIT_EXCLUDED_FIELDS
    ]


def _is_sensitive_field(field):
    return any(secret in field.name.lower() for secret in ("password", "token", "secret"))


def _json_safe(value):
    if hasattr(value, "storage") and hasattr(value, "name"):
        value = value.name
    return json.loads(json.dumps(value, cls=DjangoJSONEncoder))


def _audit_changes(fields, old_values, new_values, created=False):
    changes = {}
    for field in fields:
        name = field.name
        old_value = old_values.get(field.attname) if old_values else None
        new_value = new_values.get(field.attname)
        if created and new_value is None:
            continue
        if not created and old_value == new_value:
            continue
        if _is_sensitive_field(field):
            if not created:
                changes[name] = {"changed": True}
            continue
        changes[name] = {
            "from": _json_safe(old_value),
            "to": _json_safe(new_value),
        }
    return changes


@receiver(pre_save)
def capture_audit_before_save(sender, instance, **kwargs):
    if not _is_audited_model(sender) or instance.pk is None:
        return

    field_names = [field.attname for field in _auditable_fields(sender)]
    instance._audit_old_values = (
        sender._base_manager.filter(pk=instance.pk)
        .values(*field_names)
        .first()
    )


@receiver(post_save)
def write_model_audit(sender, instance, created, **kwargs):
    if not _is_audited_model(sender):
        return

    fields = _auditable_fields(sender)
    old_values = getattr(instance, "_audit_old_values", None)
    new_values = (
        sender._base_manager.filter(pk=instance.pk)
        .values(*(field.attname for field in fields))
        .first()
        or {}
    )
    changes = _audit_changes(fields, old_values, new_values, created=created)
    if hasattr(instance, "_audit_old_values"):
        del instance._audit_old_values

    if not created and not changes:
        return

    if created:
        action = "created"
    elif changes.get("is_active", {}).get("to") is False:
        action = "deleted"
    elif changes.get("is_archived", {}).get("to") is True:
        action = "archived"
    elif "status" in changes:
        new_status = changes["status"]["to"]
        action = new_status if sender._meta.label_lower == "billing.bill" else "status_changed"
    else:
        action = "updated"

    record_audit(instance, action, changes)


@receiver(pre_delete)
def write_delete_audit(sender, instance, **kwargs):
    if _is_audited_model(sender):
        record_audit(instance, "deleted", {"deleted": True})


@receiver(m2m_changed)
def write_many_to_many_audit(sender, instance, action, reverse, model, pk_set, **kwargs):
    if action == "pre_clear":
        relations = (
            [
                relation
                for relation in instance._meta.related_objects
                if relation.many_to_many and relation.through is sender
            ]
            if reverse
            else [
                field
                for field in instance._meta.many_to_many
                if field.remote_field.through is sender
            ]
        )
        if relations:
            relation_name = (
                relations[0].get_accessor_name() if reverse else relations[0].name
            )
            instance._audit_cleared_relation_ids = list(
                getattr(instance, relation_name).values_list("pk", flat=True)
            )
            instance._audit_cleared_relation_name = relation_name
        return
    if action not in {"post_add", "post_remove", "post_clear"}:
        return
    if not _is_audited_model(instance.__class__):
        return

    relation_action = {
        "post_add": "added",
        "post_remove": "removed",
        "post_clear": "cleared",
    }[action]
    related_ids = sorted(pk_set or [])
    if action == "post_clear":
        related_ids = getattr(instance, "_audit_cleared_relation_ids", [])
        if hasattr(instance, "_audit_cleared_relation_ids"):
            del instance._audit_cleared_relation_ids
    relation_name = getattr(instance, "_audit_cleared_relation_name", None)
    if hasattr(instance, "_audit_cleared_relation_name"):
        del instance._audit_cleared_relation_name
    if not relation_name:
        relations = (
            [
                relation
                for relation in instance._meta.related_objects
                if relation.many_to_many and relation.through is sender
            ]
            if reverse
            else [
                field
                for field in instance._meta.many_to_many
                if field.remote_field.through is sender
            ]
        )
        relation_name = (
            relations[0].get_accessor_name() if reverse else relations[0].name
        ) if relations else model._meta.model_name
    record_audit(
        instance,
        f"relation_{relation_action}",
        {relation_name: {"operation": relation_action, "ids": related_ids}},
    )


# Stash the pre-save value of requested_cancellation on the instance so the
# post_save handler below can tell whether it actually changed on this save.
@receiver(pre_save, sender=Booking)
def stash_previous_requested_cancellation(sender, instance, **kwargs):
    if instance.pk:
        instance._previous_requested_cancellation = (
            Booking.objects.filter(pk=instance.pk)
            .values_list("requested_cancellation", flat=True)
            .first()
        )
    else:
        instance._previous_requested_cancellation = None


@receiver(post_save, sender=Booking)
def booking_notifications(sender, instance, created, **kwargs):
    # 1. NEW BOOKING (Notify Admin/Staff)
    if created:
        notify_staff(
            title="New Booking Request",
            message=f"New booking #{instance.id} from {instance.tourist.email} is pending approval.",
            booking=instance
        )

    # 2. STATUS CHANGES (Notify Tourist)
    # We check if the status was updated (this logic works best if you track previous_status)
    else:
        # Notify User of Approval/Rejection/Cancellation
        Notification.objects.create(
            user=instance.tourist,
            notification_type="booking",
            title=f"Booking {instance.status.capitalize()}",
            message=f"Your booking for {instance.package.name if instance.package else 'Tour'} has been changed to {instance.status}.",
            related_booking=instance
        )

        # 3. GUIDE ASSIGNMENT (Notify both Guide and Tourist)
        # Note: Your model updates assigned_guide in save(). 
        # If a guide is present and the status just became approved:
        if instance.status == "approved" and instance.assigned_guide:
            # Notify the Guide
            Notification.objects.create(
                user=instance.assigned_guide,
                notification_type="system",
                title="New Assignment",
                message=f"You have been assigned to Booking #{instance.id} starting {instance.check_in}.",
                related_booking=instance
            )
            # Notify the Tourist
            Notification.objects.create(
                user=instance.tourist,
                notification_type="system",
                title="Guide Assigned",
                message=f"{instance.assigned_guide.username} has been assigned as your guide!",
                related_booking=instance
            )

    # 4. CANCELLATION REQUEST TOGGLED (Notify Tourist + Staff)
    previous_requested_cancellation = getattr(
        instance, "_previous_requested_cancellation", None
    )
    cancellation_flag_changed = (
        not created
        and previous_requested_cancellation is not None
        and previous_requested_cancellation != instance.requested_cancellation
    )

    if cancellation_flag_changed:
        if instance.requested_cancellation:
            Notification.objects.create(
                user=instance.tourist,
                notification_type="booking",
                title="Cancellation Requested",
                message=f"Booking #{instance.id} has been requested for cancellation.",
                related_booking=instance
            )
            notify_staff(
                title="Cancellation Requested",
                message=f"Booking #{instance.id} has been requested for cancellation.",
                booking=instance
            )
        else:
            Notification.objects.create(
                user=instance.tourist,
                notification_type="booking",
                title="Cancellation Rescinded",
                message=f"Booking #{instance.id} request for cancellation rescinded.",
                related_booking=instance
            )
            notify_staff(
                title="Cancellation Rescinded",
                message=f"Booking #{instance.id} request for cancellation rescinded.",
                booking=instance
            )


@receiver(post_save, sender=Permit)
def permit_notifications(sender, instance, created, **kwargs):
    # 4. PERMIT ISSUED (Notify Tourist)
    if created:
        Notification.objects.create(
            user=instance.booking.tourist,
            notification_type="permit",
            title="Travel Permit Issued",
            message=f"Your permit ({instance.permit_number}) is ready for download.",
            related_booking=instance.booking
        )

@receiver(post_save, sender=Review)
def review_notifications(sender, instance, created, **kwargs):
    # 5. NEW REVIEW (Notify Guide if they were reviewed)
    if created and instance.target_type == "guide" and instance.tour_guide:
        Notification.objects.create(
            user=instance.tour_guide,
            notification_type="review",
            title="New Review Received",
            message=f"A tourist rated you {instance.rating}/5 stars.",
            related_booking=instance.booking
        )