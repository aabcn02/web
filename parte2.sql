CREATE TABLE IF NOT EXISTS usuarios (
  email TEXT PRIMARY KEY,
  nombre TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'editor')),
  activo INTEGER NOT NULL DEFAULT 1,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO usuarios (email, nombre, rol) VALUES ('aabcn02@gmail.com', 'Administrador', 'admin');
INSERT OR IGNORE INTO usuarios (email, nombre, rol) VALUES ('emgder@yahoo.com.mx', 'Editor', 'editor');
CREATE TABLE IF NOT EXISTS noticias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT NOT NULL DEFAULT 'noticia' CHECK (categoria IN ('noticia', 'publicacion', 'reflexion')),
  titulo TEXT NOT NULL,
  fecha TEXT NOT NULL,
  resumen TEXT,
  contenido TEXT NOT NULL DEFAULT '',
  imagen TEXT,
  publicado INTEGER NOT NULL DEFAULT 1,
  autor TEXT,
  creado TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_noticias_publicas ON noticias (publicado, categoria, fecha DESC);
CREATE TABLE IF NOT EXISTS paginas (slug TEXT PRIMARY KEY, titulo TEXT NOT NULL, contenido TEXT NOT NULL, actualizado TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS bitacora (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  email TEXT NOT NULL,
  accion TEXT NOT NULL,
  detalle TEXT
);
