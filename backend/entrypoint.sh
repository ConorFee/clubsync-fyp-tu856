#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Loading sample data..."
python manage.py load_sample_data

echo "Starting Gunicorn..."
exec gunicorn clubsync_project.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
