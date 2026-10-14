ALTER TABLE noticias ADD COLUMN hora TEXT;
ALTER TABLE noticias ADD COLUMN de_tipo TEXT NOT NULL DEFAULT 'area';
ALTER TABLE noticias ADD COLUMN de_distrito TEXT;
ALTER TABLE noticias ADD COLUMN de_grupo_id INTEGER;
ALTER TABLE noticias ADD COLUMN de_nombre TEXT;
UPDATE noticias SET categoria = 'noticia' WHERE categoria <> 'noticia';
UPDATE paginas SET contenido = replace(contenido, 'contacto@aabcn02.org', 'bajanorte2@aamexico.org.mx');
