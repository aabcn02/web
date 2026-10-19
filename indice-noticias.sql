DROP INDEX IF EXISTS idx_noticias_publicas;
CREATE INDEX IF NOT EXISTS idx_noticias_orden ON noticias (publicado, fecha DESC, hora DESC, id DESC);
