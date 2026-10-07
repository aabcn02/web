-- Tabla de grupos: alimenta el Directorio y el Mapa.
-- Se pega UNA vez en la consola de D1 (Cloudflare).

CREATE TABLE IF NOT EXISTS grupos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  distrito    TEXT    NOT NULL,
  grupo       TEXT    NOT NULL,
  ciudad      TEXT    NOT NULL,
  direccion   TEXT,
  terapia     TEXT,
  personas    TEXT,
  horario     TEXT,
  lat         REAL,
  lng         REAL,
  maps_url    TEXT,
  activo      INTEGER NOT NULL DEFAULT 1,
  actualizado TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grupos_activo ON grupos (activo);
