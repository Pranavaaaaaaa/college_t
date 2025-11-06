#!/usr/bin/env bash
# Exit on error
set -o errexit

# 1. Install all Python dependencies from requirements.txt
pip install -r requirements.txt

# 2. Collect all of Django's static files (like admin CSS)
# into the 'staticfiles' directory we defined in settings.py
python manage.py collectstatic --no-input

# 3. Run any database migrations
python manage.py migrate