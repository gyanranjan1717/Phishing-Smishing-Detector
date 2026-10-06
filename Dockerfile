FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY api/ ./api/
COPY models/ ./models/
COPY run.py ./

ENV MODELS_DIR=/app/models
ENV DECISION_THRESHOLD=0.070

EXPOSE 10000

CMD ["python", "run.py"]
