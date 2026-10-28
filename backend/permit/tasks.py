from celery import shared_task
from .models import Permit
from .services.generator import generate_permit_pdf

@shared_task
def generate_permit_pdf_task(permit_id):
    try:
        permit = Permit.objects.get(pk=permit_id)
    except Permit.DoesNotExist:
        return f"Permit {permit_id} not found"

    generate_permit_pdf(permit)
    return f"Permit {permit_id} generated successfully"