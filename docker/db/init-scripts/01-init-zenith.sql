# SPDX-FileCopyrightText: 2026 Martín Hernández González <m.hernandezg@udc.es>
# SPDX-FileCopyrightText: 2026 Alex Mosquera Gundín <alex.mosquera@udc.es>
# SPDX-FileCopyrightText: 2026 Alberto Paz Pérez <a.pazp@udc.es>
#
# SPDX-License-Identifier: GPL-3.0-or-later

-- Zenith Database Initialization Script
-- This script runs automatically on first container startup

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Optional: Create initial tables if not using Alembic migrations for base schema
-- (Though the backend currently uses Alembic, having pgvector here ensures it's ready)

-- 3. Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Zenith DB initialization complete: pgvector extension enabled.';
END $$;
