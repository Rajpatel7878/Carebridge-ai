"""Local OCR with bounded inputs. Extracted text is unverified source data."""
from functools import lru_cache
from io import BytesIO
from pathlib import Path
import warnings
from threading import Lock

_OCR_LOCK = Lock()

import pymupdf
from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf import PdfReader

MAX_PIXELS = 12_000_000
MAX_PAGES = 10
MAX_TEXT = 50_000
MAX_BYTES = 10 * 1024 * 1024


class ExtractionError(Exception):
    pass


@lru_cache(maxsize=1)
def _engine():
    from rapidocr_onnxruntime import RapidOCR
    return RapidOCR()


def _recognize(image: Image.Image) -> str:
    buf = BytesIO()
    image.convert('RGB').save(buf, format='PNG')
    try:
        with _OCR_LOCK:
            rows, _ = _engine()(buf.getvalue())
    except Exception as exc:
        raise ExtractionError('OCR could not process the image. Please use the original report.') from exc
    # Keep only returned source text; no medical interpretation or generated values.
    return '\n'.join(str(row[1]) for row in rows or [] if len(row) >= 2).strip()


def extract_document(path: Path, file_type: str) -> dict:
    try:
        size = path.stat().st_size
    except OSError as exc:
        raise ExtractionError('Report file is unavailable.') from exc
    if size > MAX_BYTES:
        raise ExtractionError('Report exceeds the OCR processing limit of 10 MB.')
    pages = []
    if file_type in ('PNG', 'JPG'):
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(path) as image:
                    if image.format != ('PNG' if file_type == 'PNG' else 'JPEG'):
                        raise ExtractionError('Image format does not match the stored report type.')
                    if image.width * image.height > MAX_PIXELS:
                        raise ExtractionError('Image dimensions exceed the OCR safety limit.')
                    image = ImageOps.exif_transpose(image)
                    image.load()
                    text = _recognize(image)
            pages.append({'page': 1, 'method': 'OCR', 'text': text})
        except ExtractionError:
            raise
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            raise ExtractionError('The image could not be read safely.') from exc
    elif file_type == 'PDF':
        try:
            reader = PdfReader(str(path), strict=False)
            if reader.is_encrypted:
                raise ExtractionError('Encrypted PDF cannot be processed.')
            if len(reader.pages) > MAX_PAGES:
                raise ExtractionError('PDF exceeds the 10-page extraction limit.')
            with pymupdf.open(path) as doc:
                for index, page in enumerate(reader.pages):
                    text = (page.extract_text() or '').strip()
                    method = 'PDF_TEXT'
                    if not text:
                        pdf_page = doc[index]
                        rect = pdf_page.rect
                        scale = min(2.0, (MAX_PIXELS / max(1.0, rect.width * rect.height)) ** 0.5)
                        if scale < 0.25:
                            raise ExtractionError('PDF page dimensions exceed the OCR safety limit.')
                        pix = pdf_page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
                        if pix.width * pix.height > MAX_PIXELS:
                            raise ExtractionError('PDF page dimensions exceed the OCR safety limit.')
                        with Image.open(BytesIO(pix.tobytes('png'))) as image:
                            text = _recognize(image)
                        method = 'OCR'
                    pages.append({'page': index + 1, 'method': method, 'text': text})
                    if sum(len(p['text']) for p in pages) > MAX_TEXT:
                        raise ExtractionError('Extracted text exceeds the processing limit.')
        except ExtractionError:
            raise
        except Exception as exc:
            raise ExtractionError('The PDF could not be read. Please use the original report or retry.') from exc
    else:
        raise ExtractionError('Unsupported report format.')
    if not any(page['text'] for page in pages):
        raise ExtractionError('No readable text was found. Please use the original report or retry.')
    text = '\n\n'.join(f"Page {p['page']}:\n{p['text']}" for p in pages if p['text'])
    if len(text) > MAX_TEXT:
        raise ExtractionError('Extracted text exceeds the processing limit.')
    return {'text': text, 'pages': pages, 'limitations': ['Extraction and OCR may omit or misread content, particularly rotated or blurry text. Compare with the original report.']}
