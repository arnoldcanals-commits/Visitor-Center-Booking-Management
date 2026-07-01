from decimal import Decimal

from django.db.models import Sum

def recalculate_totals(bill):
    total = bill.items.aggregate(Sum('final_amount'))['final_amount__sum'] or Decimal('0.00')
    # Update the related booking total
    bill.booking.total_amount = total
    bill.booking.save()
    return total