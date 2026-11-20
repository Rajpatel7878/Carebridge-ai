"""Local OCR tests use only generated synthetic images and documents."""
from io import BytesIO
import pytest
import pymupdf
from PIL import Image, ImageDraw, ImageFont
from app.ai.ocr import ExtractionError, extract_document


def sample_image(fmt='PNG') -> bytes:
    image = Image.new('RGB', (1300, 240), 'white')
    ImageDraw.Draw(image).text((40, 65), 'SYNTHETIC REPORT', fill='black', font=ImageFont.load_default(size=64))
    buf = BytesIO(); image.save(buf, format=fmt)
    return buf.getvalue()


@pytest.mark.parametrize(('fmt', 'kind'), [('PNG', 'PNG'), ('JPEG', 'JPG')])
def test_local_image_ocr(tmp_path, fmt, kind):
    path = tmp_path / 'sample'; path.write_bytes(sample_image(fmt))
    result = extract_document(path, kind)
    assert 'SYNTHETIC' in result['text'].upper()
    assert result['pages'][0]['method'] == 'OCR'


def test_scanned_pdf_ocr(tmp_path):
    path = tmp_path / 'scan.pdf'
    pdf = pymupdf.open(); page = pdf.new_page(width=650, height=120)
    page.insert_image(page.rect, stream=sample_image()); pdf.save(path); pdf.close()
    result = extract_document(path, 'PDF')
    assert 'SYNTHETIC' in result['text'].upper()
    assert result['pages'][0]['page'] == 1
    assert result['pages'][0]['method'] == 'OCR'


def test_invalid_empty_and_oversized_input(tmp_path):
    path = tmp_path / 'file.png'; path.write_bytes(b'not an image')
    with pytest.raises(ExtractionError): extract_document(path, 'PNG')
    path.write_bytes(sample_image('JPEG'))
    with pytest.raises(ExtractionError, match='format'): extract_document(path, 'PNG')
    buf = BytesIO(); Image.new('RGB', (500, 150), 'white').save(buf, format='PNG'); path.write_bytes(buf.getvalue())
    with pytest.raises(ExtractionError, match='No readable text'): extract_document(path, 'PNG')
    path.write_bytes(b'x' * (10 * 1024 * 1024 + 1))
    with pytest.raises(ExtractionError, match='limit'): extract_document(path, 'PNG')
    with pytest.raises(ExtractionError): extract_document(path, 'UNKNOWN')
