from pathlib import Path

import pymupdf
from PIL import Image


REPORT_DIR = Path(__file__).resolve().parent.parent
PDF_PATH = REPORT_DIR / "build" / "oceanus_folk_report.pdf"
OUTPUT_DIR = REPORT_DIR / "rendered"
OUTPUT_DIR.mkdir(exist_ok=True)

for old_render in OUTPUT_DIR.glob("page-*.png"):
    old_render.unlink()
(OUTPUT_DIR / "contact-sheet.png").unlink(missing_ok=True)

document = pymupdf.open(PDF_PATH)
page_images = []

for index, page in enumerate(document):
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
    output_path = OUTPUT_DIR / f"page-{index + 1:02d}.png"
    pixmap.save(output_path)
    page_images.append(Image.open(output_path).convert("RGB"))

thumb_width = 500
gap = 24
columns = 2
thumbnails = []

for image in page_images:
    height = round(image.height * thumb_width / image.width)
    thumbnails.append(image.resize((thumb_width, height), Image.Resampling.LANCZOS))

thumb_height = max(image.height for image in thumbnails)
rows = (len(thumbnails) + columns - 1) // columns
sheet = Image.new(
    "RGB",
    (
        columns * thumb_width + (columns - 1) * gap,
        rows * thumb_height + (rows - 1) * gap,
    ),
    "#dfe7ee",
)

for index, image in enumerate(thumbnails):
    x = (index % columns) * (thumb_width + gap)
    y = (index // columns) * (thumb_height + gap)
    sheet.paste(image, (x, y))

sheet.save(OUTPUT_DIR / "contact-sheet.png")
print(f"Rendered {document.page_count} pages.")
