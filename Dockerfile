# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Django backend + serve React
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy React build output
COPY --from=frontend-build /app/frontend/dist /app/frontend_dist

# Collect static files (uses placeholder SECRET_KEY for build phase)
RUN SECRET_KEY=build-placeholder python manage.py collectstatic --noinput

EXPOSE 8000

# Entrypoint: run migrations + load sample data, then start Gunicorn
CMD ["bash", "entrypoint.sh"]
