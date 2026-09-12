from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import io

root = Path('/home/ubuntu/omegalibrary/client/fixtures')
root.mkdir(parents=True, exist_ok=True)
png = io.BytesIO()
Image.new('RGB', (24, 24), (239, 180, 50)).save(png, format='PNG')
png.seek(0)
out = root / 'pdf-with-embedded-image.pdf'
pdf = canvas.Canvas(str(out), pagesize=(240, 320))
pdf.setTitle('PDF de prueba visual')
pdf.drawString(24, 285, 'Pagina con imagen embebida')
pdf.drawImage(ImageReader(png), 90, 110, width=60, height=60, mask='auto')
pdf.showPage()
pdf.save()
print(out)
