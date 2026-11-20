# =============================================================================
# CareBridge AI — Backend Dockerfile (FastAPI + Uvicorn)
# =============================================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Create non-root runtime user
RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --create-home appuser

# Install Python dependencies first for optimal layer caching
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install --force-reinstall --no-deps opencv-python-headless==5.1.0.95

# Copy backend source and Alembic migration files
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app

RUN mkdir -p /app/uploads/medical_reports /var/lib/carebridge/uploads \
    && chmod 700 /app/uploads/medical_reports /var/lib/carebridge/uploads \
    && chown -R appuser:appgroup /app /var/lib/carebridge
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=3)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
