
# 🚌 College Transportation System

A comprehensive real-time shuttle tracking and management system for college campuses. This project features a Django backend with WebSockets for live tracking and a React frontend for students and drivers.

## 🌟 Features

- **Real-time Bus Tracking:** Live updates of bus location on the map using WebSockets.

- **Route Optimization:** Automated route generation based on student addresses using OpenRouteService.

- **Role-based Dashboards:**

- **Student:** View assigned route, live bus location, estimated arrival time, and opt-in/out of boarding.

- **Driver:** Broadcast location, view student stop list, and re-order stops.

- **Admin:** Manage users, generate routes, and view live fleet status on an interactive map.

- **Smart Notifications:** Geofence-based alerts when the bus is approaching a stop.

# 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your system:

  

1. **Git:** Download Git
2. **Python** (v3.10 - v3.12): Download Python
	- Note: Do not use Python 3.13+ as it is currently incompatible with some Django Channels dependencies.

3. **Node.js** (LTS Version): Download Node.js
4. **Redis:** Download for Windows

- Download the `.msi` installer and ensure "Add to PATH" is checked during installation.

# 🚀 Installation & Setup

  

1. **Clone the Repository**

  

	Open your terminal (PowerShell, Command Prompt, or Git Bash) and run:
	```
		git clone https://github.com/Pranavaaaaaaa/college_t.git
		cd college_t
	```

2. **Backend Setup (Django)**

  

	1.  **Create a Virtual Environment:**

	```
	# Ensure you are using Python 3.10-3.12
	python -m venv venv
	```

	2. **Activate the Virtual Environment:**

		- Windows:
			```
			.\venv\Scripts\activate
			```

		- Mac/Linux:
			```
			source venv/bin/activate
			```

  

	3. **Install Dependencies:**

	```
	pip install -r requirements.txt
	```

	4. **Apply Database Migrations:**

	```
	python manage.py migrate
	```
	5. **Create an Admin User:**

	```
	python manage.py createsuperuser
	```

	- Follow the prompts to set a username (e.g., admin) and password.

  

3. **Frontend Setup (React)**

	1. Open a **new terminal.**
	3. Navigate to the frontend directory:
		```
		cd student-app
		```
	3. Install Node modules:
		```
		npm install
		```

# ⚙️ Configuration

1. **OpenRouteService API Key (Backend)**
	This project uses OpenRouteService (ORS) for route calculation.
	1. Get a free API key from openrouteservice.org.
	2. Open core/settings.py.
	3. Find the ORS_API_KEY variable at the bottom and replace the placeholder with your key:
		```
		ORS_API_KEY = os.environ.get('ORS_API_KEY', 'YOUR_ACTUAL_API_KEY_HERE')
		```
2. Redis
Ensure your Redis server is running.
	- If you installed via .msi on Windows, it runs automatically as a service.
	- You can verify it by opening a terminal and typing redis-cli ping. It should reply PONG.

## 🏃‍♂️ Running the Application
You need to run three separate terminals simultaneously.

**Terminal 1: Redis Server**
(Only required if you didn't install it as a Windows Service. If you downloaded the ZIP version, go to that folder and run this).
```
redis-server.exe
```

**Terminal 2: Django Backend**
Make sure your virtual environment is active (`(venv)` should be visible).
```
cd C:\Path\To\college_t
.\venv\Scripts\activate
python manage.py runserver --noreload
```
*We use --noreload to prevent issues with the WebSocket threads restarting too quickly during development.*

**Terminal 3: React Frontend**

    cd C:\Path\To\college_t\student-app
	npm start

This will automatically open the app at http://localhost:3000.

## 📱 Usage Guide
1. **Setting up Data (Admin)**
	1. Go to http://localhost:3000/login and select "Admin" from the dropdown.
	2. Log in with your superuser credentials.
	3. Go to "Colleges" and add your college location (Lat/Long).
	4. **Simulate Students:**
		- Go to the React app (http://localhost:3000/signup).
		- Sign up as 5 different students.
		- For each student, set a home location on the map.
	5. **Generate Routes:**
		- Go back to the Admin Panel.
		- Click on "Unassigned Students" (under the UNASSIGNED app).
		- Click the "Generate Routes for New Students" button.
		- The system will cluster students and create "Route A".
	6. **Create a Driver:**
		-  In the Admin Panel, create a new User (e.g., driver1).
		- Go to "Driver Profiles", add a profile for driver1, and assign them to "Route A".
2. **Simulating a Trip**
	1. **Driver:** Open an Incognito window, go to localhost:3000, and log in as driver1.
		- Click "**Start Broadcasting Location**".
	2. **Student:** In your main window, log in as one of the students on Route A.
		- Ensure "Boarding Today?" is checked.
		- You will see the bus marker appear on the map.
		- A blue line will draw the path from the bus to your stop.
		- As the bus (Driver) gets within 500m of the Student's location, an Alert will pop up on the Student's screen.

## 🐛 Troubleshooting
- **WebSocket 404 Error:** Ensure you are running `daphne` or `runserver` correctly and that `channels` is installed.
- **Map not loading:** Ensure you have an internet connection (Leaflet needs to fetch map tiles).
- **"502 Bad Gateway" for Route:** Check your `ORS_API_KEY` in `settings.py`.
- **"Failed to send location":** Ensure you are logged in as a Driver and your session hasn't expired.

# There are some deployment code left out in `settings.py`, but the code works well with that too on local system after cloning