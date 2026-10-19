CREATE TABLE IF NOT EXISTS subidas (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, clave TEXT NOT NULL, bytes INTEGER NOT NULL, fecha TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS idx_subidas_email_fecha ON subidas (email, fecha);
CREATE INDEX IF NOT EXISTS idx_subidas_fecha ON subidas (fecha);
