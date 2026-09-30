CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1. KORISNICI
-- =========================================================
CREATE TABLE IF NOT EXISTS korisnici (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  naziv VARCHAR(100) NOT NULL
);

ALTER TABLE korisnici
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'korisnici'
      AND column_name = 'password'
  ) THEN
    UPDATE korisnici
    SET password_hash = crypt(password, gen_salt('bf', 10))
    WHERE password_hash IS NULL;

    ALTER TABLE korisnici DROP COLUMN password;
  END IF;
END $$;

ALTER TABLE korisnici
ALTER COLUMN password_hash SET NOT NULL;

INSERT INTO korisnici (id, username, password_hash, role, naziv)
VALUES
  ('f1', 'firma', crypt('123', gen_salt('bf', 10)), 'firma', 'Glavna Firma Veleprodaja'),
  ('t1', 'trgovina1', crypt('123', gen_salt('bf', 10)), 'trgovina', 'Trgovina Centar'),
  ('t2', 'trgovina2', crypt('123', gen_salt('bf', 10)), 'trgovina', 'Trgovina Kvart')
ON CONFLICT (username) DO NOTHING;

-- =========================================================
-- 2. NARUDŽBE
-- =========================================================
CREATE TABLE IF NOT EXISTS narudzbe (
  id VARCHAR(50) PRIMARY KEY,
  trgovina_id VARCHAR(50) REFERENCES korisnici(id),
  datum VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Poslata'
);

ALTER TABLE narudzbe
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE narudzbe
SET created_at = CASE
  WHEN id ~ '^[0-9]{13}$' THEN to_timestamp(id::bigint / 1000.0)
  WHEN datum ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN datum::timestamptz
  ELSE NOW()
END
WHERE created_at IS NULL;

ALTER TABLE narudzbe
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE narudzbe
ALTER COLUMN created_at SET NOT NULL;

-- =========================================================
-- 3. STAVKE NARUDŽBE
-- =========================================================
CREATE TABLE IF NOT EXISTS stavke_narudzbe (
  id SERIAL PRIMARY KEY,
  narudzba_id VARCHAR(50) REFERENCES narudzbe(id) ON DELETE CASCADE,
  naziv VARCHAR(100) NOT NULL,
  kolicina VARCHAR(20) NOT NULL,
  jedinica VARCHAR(20) NOT NULL,
  cijena NUMERIC(10,2),
  na_stanju BOOLEAN DEFAULT TRUE
);

-- =========================================================
-- 4. RAČUNI
-- =========================================================
CREATE TABLE IF NOT EXISTS racuni (
  id VARCHAR(50) PRIMARY KEY,
  narudzba_id VARCHAR(50),
  trgovina_id VARCHAR(50) REFERENCES korisnici(id),
  opis TEXT,
  iznos NUMERIC(10,2) NOT NULL,
  uplaceno NUMERIC(10,2) NOT NULL DEFAULT 0,
  placen BOOLEAN NOT NULL DEFAULT FALSE,
  datum VARCHAR(50) NOT NULL
);

ALTER TABLE racuni
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE racuni
SET created_at = CASE
  WHEN id ~ '^[0-9]{13}$' THEN to_timestamp(id::bigint / 1000.0)
  WHEN datum ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN datum::timestamptz
  ELSE NOW()
END
WHERE created_at IS NULL;

ALTER TABLE racuni
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE racuni
ALTER COLUMN created_at SET NOT NULL;

-- =========================================================
-- 5. STRUKTURIRANE STAVKE RAČUNA
-- =========================================================
CREATE TABLE IF NOT EXISTS stavke_racuna (
  id SERIAL PRIMARY KEY,
  racun_id VARCHAR(50) NOT NULL REFERENCES racuni(id) ON DELETE CASCADE,
  naziv VARCHAR(150) NOT NULL,
  trazeno TEXT,
  stvarna_kolicina NUMERIC(12,3),
  jedinica VARCHAR(30),
  cijena_jedinicna NUMERIC(12,2),
  iznos NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'ISPORUCENO',
  CHECK (status IN ('ISPORUCENO', 'NEMA_NA_STANJU')),
  CHECK (iznos >= 0)
);

-- =========================================================
-- 6. TRANSAKCIJE
-- =========================================================
CREATE TABLE IF NOT EXISTS transakcije (
  id VARCHAR(50) PRIMARY KEY,
  trgovina_id VARCHAR(50) REFERENCES korisnici(id),
  tip VARCHAR(20) NOT NULL,
  iznos NUMERIC(10,2) NOT NULL,
  opis TEXT,
  datum VARCHAR(50) NOT NULL
);

ALTER TABLE transakcije
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE transakcije
SET created_at = CASE
  WHEN id ~ '^[0-9]{13}$' THEN to_timestamp(id::bigint / 1000.0)
  WHEN datum ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN datum::timestamptz
  ELSE NOW()
END
WHERE created_at IS NULL;

ALTER TABLE transakcije
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE transakcije
ALTER COLUMN created_at SET NOT NULL;

-- =========================================================
-- 7. ALOKACIJE TRANSAKCIJA
-- =========================================================
CREATE TABLE IF NOT EXISTS alokacije_transakcija (
  id SERIAL PRIMARY KEY,
  transakcija_id VARCHAR(50) NOT NULL REFERENCES transakcije(id) ON DELETE CASCADE,
  racun_id VARCHAR(50) NOT NULL REFERENCES racuni(id) ON DELETE CASCADE,
  iznos NUMERIC(10,2) NOT NULL CHECK (iznos > 0),
  UNIQUE (transakcija_id, racun_id)
);

CREATE INDEX IF NOT EXISTS idx_narudzbe_created_at
  ON narudzbe (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_racuni_trgovina_placen
  ON racuni (trgovina_id, placen);

CREATE INDEX IF NOT EXISTS idx_racuni_created_at
  ON racuni (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stavke_racuna_racun
  ON stavke_racuna (racun_id);

CREATE INDEX IF NOT EXISTS idx_transakcije_created_at
  ON transakcije (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alokacije_transakcija
  ON alokacije_transakcija (transakcija_id);
