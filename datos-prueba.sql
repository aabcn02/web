-- Grupos DE PRUEBA para ver el sitio funcionando.
-- Cuando carguemos el Excel real, se borran con:  DELETE FROM grupos;

INSERT INTO grupos (distrito, grupo, ciudad, direccion, terapia, personas, horario, lat, lng) VALUES
('1', '[Prueba] Grupo Uno',    'Mexicali',   'Calle Ejemplo 100, Centro',          'Tradicional', 'Mixto',   'Diario de 19:00 a 20:30',        32.6630, -115.4680),
('1', '[Prueba] Grupo Dos',    'Mexicali',   'Av. Ejemplo 250, Pueblo Nuevo',      'Tradicional', 'Mujeres', 'Lunes a viernes de 10:00 a 11:30', 32.6545, -115.4890),
('2', '[Prueba] Grupo Tres',   'Mexicali',   'Calle Prueba 45, Col. Industrial',   'Tradicional', 'Mixto',   'Martes y jueves de 18:00 a 19:30', 32.6295, -115.4520),
('2', '[Prueba] Grupo Cuatro', 'Mexicali',   'Blvd. Ejemplo 900, Col. Orizaba',    'Tradicional', 'Hombres', 'Diario de 07:00 a 08:00',        32.6180, -115.4210),
('3', '[Prueba] Grupo Cinco',  'San Felipe', 'Calle Muestra 12, Centro',           'Tradicional', 'Mixto',   'Sábados de 17:00 a 18:30',       31.0247, -114.8406);
