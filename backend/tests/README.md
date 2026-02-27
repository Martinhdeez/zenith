# Testing Infrastructure

## Setup (solo primera vez)

Crear la base de datos de tests:

```bash
docker exec devarena_db psql -U devuser -d devarena_db -c "CREATE DATABASE test_devarena_db;"
```

---

## Quick Start

```bash
# Run ALL tests in Docker (recommended)
docker exec devarena_backend pytest app/ -v

# Run with coverage
docker exec devarena_backend pytest app/ --cov=app --cov-report=html

# Run specific tests
docker exec devarena_backend pytest app/features/user/tests/ -v
docker exec devarena_backend pytest app/features/auth/tests/ -v
```

## Configuration

- **Database**: Uses `.env.dev` → PostgreSQL in Docker
- **Test DB**: Automatically uses `test_devarena_db`
- **Fixtures**: Defined in `conftest.py`
- **Config**: `pytest.ini` at backend root
---
