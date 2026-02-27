# DevArena

---

## 🚀 Quick Start

### 1. Clone repository
```bash
git clone <repo-url>
cd devArena
```

### 2. Configure environment variables
```bash
cp backend/.env.dev.example backend/.env.dev
# Edit backend/.env.dev with your values
```

### 3. Start services with Docker
```bash
cd docker
docker compose -f docker-compose-dev.yml up -d
```

**Available services:**
- 🌐 Backend API: http://localhost:8000
- 🗄️ PostgreSQL: localhost:5432
- 📖 API Docs: http://localhost:8000/docs

### 4. Initialize Database (**First Time Only**)
```bash
# Run from project root
./scripts/init-db.sh
```

---

## 🗄️ Database Management

### First Time Setup
After starting services for the first time, initialize the database:
```bash
./scripts/init-db.sh
```

This script runs Alembic migrations to create all necessary tables.

### When Models Change
```bash
# 1. Generate migration
docker exec devarena_backend bash -c "cd /app/alembic && alembic revision --autogenerate -m 'description'"

# 2. Review generated migration in backend/alembic/versions/

# 3. Apply migration
./scripts/init-db.sh  # or docker exec devarena_backend bash -c "cd /app/alembic && alembic upgrade head"
```

### Migration Commands
```bash
# View migration history
docker exec devarena_backend bash -c "cd /app/alembic && alembic history"

# Check current version
docker exec devarena_backend bash -c "cd /app/alembic && alembic current"

# Rollback one migration
docker exec devarena_backend bash -c "cd /app/alembic && alembic downgrade -1"
```

> **Note**: In production, migrations should be automated as part of your CI/CD pipeline.

---

## 🧪 Testing

### Initial setup (first time only)
```bash
# Create test database
docker exec devarena_db psql -U devuser -d devarena_db -c "CREATE DATABASE test_devarena_db;"
```

### Run all tests
```bash
docker exec devarena_backend pytest app/ -v
```

### Specific tests
```bash
# User tests only
docker exec devarena_backend pytest app/features/user/tests/ -v

# Auth tests only
docker exec devarena_backend pytest app/features/auth/tests/ -v
```
---

## 🛠️ Development

### View logs
```bash
# Backend
docker logs -f devarena_backend

# Database
docker logs -f devarena_db
```

### Restart services
```bash
# Restart all
docker compose -f docker/docker-compose-dev.yml restart

# Backend only (after code changes)
docker compose -f docker/docker-compose-dev.yml restart backend
```

### Rebuild with new dependencies
```bash
docker compose -f docker/docker-compose-dev.yml up backend --build -d
```

---

## 📚 Documentation

- **API Docs (Swagger):** http://localhost:8000/docs
- **API Docs (ReDoc):** http://localhost:8000/redoc
- **Testing Guide:** [backend/tests/README.md](backend/tests/README.md)

---

## 🏗️ Technologies

- **Framework:** FastAPI 0.128.8
- **Database:** PostgreSQL 17
- **ORM:** SQLAlchemy 2.0 (async)
- **Migrations:** Alembic
- **Auth:** JWT (python-jose) + Argon2 (passlib)
- **Testing:** pytest + pytest-asyncio
- **Containerization:** Docker + Docker Compose

---

## ✅ Best Practices

- ✅ **Automated tests** with automatic cleanup
- ✅ **Repository pattern** for data abstraction
- ✅ **Feature-based structure** (modular and scalable)
- ✅ **Complete type hints**
- ✅ **Native async/await**
- ✅ **Docker** for environment consistency
- ✅ **Alembic** for versioned migrations
- ✅ **Manual migration control** in development (industry standard)
