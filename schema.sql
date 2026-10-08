-- Tabla de grupos: alimenta el Directorio y el Mapa.
CREATE TABLE IF NOT EXISTS grupos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  distrito    TEXT    NOT NULL,
  grupo       TEXT    NOT NULL,
  ciudad      TEXT    NOT NULL,
  estado      TEXT,
  direccion   TEXT,
  colonia     TEXT,
  cp          TEXT,
  referencia  TEXT,
  terapia     TEXT,
  personas    TEXT,
  idioma      TEXT,
  horario     TEXT,
  telefono    TEXT,
  lat         REAL,
  lng         REAL,
  maps_url    TEXT,
  precision_ubic TEXT,
  geo_intento INTEGER NOT NULL DEFAULT 0,
  activo      INTEGER NOT NULL DEFAULT 1,
  actualizado TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_grupos_activo ON grupos (activo);
