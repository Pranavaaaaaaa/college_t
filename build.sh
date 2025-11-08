#!/usr/bin/env bash
    # Exit on error
    set -o errexit
    
    # 1. Install Python packages
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # 2. Collect static files
    python manage.py collectstatic --no-input
    
    # 3. Run database migrations
    # This will now use the DATABASE_URL provided by Render
    # to connect to your persistent PostgreSQL database
    python manage.py migrate