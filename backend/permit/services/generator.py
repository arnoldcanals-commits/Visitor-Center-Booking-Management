import subprocess
import tempfile
import os
import platform
import copy
from datetime import date
from docxtpl import DocxTemplate
from docx.table import _Row
from django.core.files import File


def get_libreoffice_command():
    if platform.system() == "Windows":
        path = r"C:\Program Files\LibreOffice\program\soffice.exe"
        if not os.path.exists(path):
            raise FileNotFoundError(f"LibreOffice not found at {path}.")
        return path
    return "libreoffice"


def _clone_row_after(table, row):
    new_tr = copy.deepcopy(row._tr)
    row._tr.addnext(new_tr)
    return _Row(new_tr, table)


def _fill_guest_table(document, guests):
    """
    Finds the table row containing FULLNAME_PLACEHOLDER and expands it
    to one row per guest by cloning real XML via python-docx.
    No Jinja tags involved — nothing for Word to corrupt.
    """
    target_table = None
    template_row = None

    for table in document.tables:
        for row in table.rows:
            cell_texts = [c.text.strip() for c in row.cells]
            if "FULLNAME_PLACEHOLDER" in cell_texts:
                target_table = table
                template_row = row
                break
        if target_table:
            break

    if not target_table or not template_row:
        raise ValueError(
            "Guest table placeholder row not found — check the template has "
            "a row with FULLNAME_PLACEHOLDER, AGE_PLACEHOLDER, GENDER_PLACEHOLDER"
        )

    if not guests:
        for cell in template_row.cells:
            cell.text = ""
        return

    last_row = template_row
    for i, guest in enumerate(guests):
        row = template_row if i == 0 else _clone_row_after(target_table, last_row)
        row.cells[0].text = guest.full_name
        row.cells[1].text = str(guest.age)
        row.cells[2].text = guest.gender
        last_row = row


def generate_permit_pdf(permit):
    template = permit.template
    guests = list(permit.guests.all())

    context = {
        "date_issued": date.today().strftime("%B %d, %Y"),
    }

    with tempfile.TemporaryDirectory() as tmp_dir:
        doc = DocxTemplate(template.file.path)
        doc.render(context)  # only handles {{ date_issued }}

        _fill_guest_table(doc.docx, guests)  # table expanded via python-docx directly

        docx_path = os.path.join(tmp_dir, "filled.docx")
        doc.save(docx_path)

        soffice_cmd = get_libreoffice_command()
        subprocess.run(
            [soffice_cmd, "--headless", "--convert-to", "pdf:writer_pdf_Export", "--outdir", tmp_dir, docx_path],
            check=True,
            timeout=60,
        )

        pdf_path = os.path.join(tmp_dir, "filled.pdf")
        with open(pdf_path, "rb") as f:
            permit.generated_pdf.save(f"permit_{permit.id}.pdf", File(f), save=False)

        permit.status = "generated"
        permit.save()

    return permit