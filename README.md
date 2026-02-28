<!--
SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>

SPDX-License-Identifier: GPL-3.0-or-later
-->

# Zenith Project

Welcome to Zenith! This is a modern platform that includes a FastAPI backend, a PostgreSQL database (with pgvector), and a React+Vite frontend.

<!-- banners -->

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)
![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white)
![Linux](https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=white)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-FF9900?style=for-the-badge&logo=alembic&logoColor=white)
![Pytest](https://img.shields.io/badge/Pytest-0A9ED8?style=for-the-badge&logo=pytest&logoColor=white)

---

Zenith preview 

![Zenith](https://i.postimg.cc/mkYRPhjn/landing-page.png)
![Zenith](https://i.postimg.cc/J04HxwFb/user-space.png)
![Zenith](https://i.postimg.cc/kM12Cpzr/projects-folder.png)
![Zenith](https://i.postimg.cc/tgc6XRB9/ia.png)


---

## 🚀 Setup & Configuration

### 1. Clone the repository
```bash
git clone <repo-url>
cd zenith
```

### 2. Configure environment variables

**Backend Variables:**
Create your development `.env.dev` file by copying the example provided in the `backend/` directory.
```bash
cp backend/.env.example backend/.env.dev
```
*Make sure to review and edit `backend/.env.dev` with your valid credentials (e.g., PostgreSQL configs, Google/Github client IDs, Firebase config, etc.).*

**Frontend Variables:**
If you need environment variables for the frontend, make sure to set them up inside a `.env` file in the `frontend/` directory.
```bash
# Create/Edit frontend/.env with your necessary variables (like VITE_API_URL or Firebase connection variables)
```

---

## � Docker Containers Management (Backend & DB)

We use Docker to orchestrate the backend and the database. The simplest way is to navigate into the `docker` directory before running the commands.

### Start the containers
To build the images with your most recent updates and start the containers in the background, run:
```bash
cd docker
docker compose up -d --build
```
> **Note:** The first time it may take a while as it downloads and builds everything. Once up, the backend is accessible at `http://localhost:8000` and the Database at `localhost:5432`.

### Restart the containers
If you want to quickly restart the containers (for example, after changing an environment variable):
```bash
cd docker
docker compose restart
```
*To restart only a specific service:*
```bash
docker compose restart backend
# or
docker compose restart db
```

### Remove the containers (Stop and Delete)
To stop the services and completely **remove all the containers** and the default network:
```bash
cd docker
docker compose down
```
If you want to completely wipe out the containers **including** the persistent data volumes and images (e.g., a total clean reset):
```bash
docker compose down -v --rmi all
```

---

## 🌐 Deploy Frontend

The frontend is a Vite + React application. It's meant to be executed locally via Node.

### Prerequisites
Make sure you have `Node.js` installed on your machine.

### Start the local development server
```bash
cd frontend

# Install project dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend should now be running at `http://localhost:5173`.

---

## 🧪 Testing the Backend

You can run your backend tests directly inside the running Docker container (`zenith_backend`).

### Run all tests
```bash
docker exec -it zenith_backend pytest app/ -v
```

### Run specific tests
You can target specific modules or files to reduce execution time during development:
```bash
# Run tests for a specific feature (e.g., auth)
docker exec -it zenith_backend pytest app/features/auth/tests/ -v

# Run tests for a specific file
docker exec -it zenith_backend pytest app/features/user/tests/test_user.py -v
```

---

## Database Migrations (Backend)

We use Alembic for our database migrations inside the backend Docker container.

### Apply Migrations
To ensure that all tables exist based on your most recent models (after your containers are up):
```bash
docker exec -it zenith_backend bash -c "cd /app && alembic upgrade head"
```

### Creating New Migrations
When your SQLAlchemy models change, follow these steps to regenerate the tables mappings:
```bash
# 1. Generate an autogenerated migration script
docker exec -it zenith_backend bash -c "cd /app && alembic revision --autogenerate -m 'description_of_changes'"

# 2. Check the generated script in backend/alembic/versions/

# 3. Apply the migration correctly
docker exec -it zenith_backend bash -c "cd /app && alembic upgrade head"
```

---

## 📚 Documentation
- **API Docs (Swagger):** http://localhost:8000/docs
- **API Docs (ReDoc):** http://localhost:8000/redoc
