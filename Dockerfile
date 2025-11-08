# 1. Use a modern, official Python image
FROM python:3.11-slim

# 2. Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Install system-level dependencies (for PostgreSQL)
RUN apt-get update \
    && apt-get install -y libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy your requirements file and install packages
# This is cached to speed up future builds
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# 6. Copy your entire project code into the container
COPY . .

# 7. Run database migrations
# Railway provides the DATABASE_URL env var automatically
RUN python manage.py migrate

# 8. Collect static files
RUN python manage.py collectstatic --no-input

# 9. Expose the port
# Railway provides the $PORT variable, but Daphne defaults to 8000
# We will tell Daphne to use the port Railway gives it.
EXPOSE 8000

# 10. The command to run your app
# This is the same command from Render, but more explicit
CMD daphne core.asgi:application --port $PORT --bind 0.0.0.0