"""Genera el SQL para dar (o restablecer) una contraseña temporal a un usuario del panel,
por si el administrador olvida la suya y no hay otro administrador que se la restablezca.

Uso:  python3 herramientas/clave_inicial.py correo@ejemplo.com admin
Imprime la contraseña temporal (en pantalla) y el SQL para pegar en la consola de D1.
"""
import base64
import hashlib
import secrets
import sys

LETRAS = "abcdefghjkmnpqrstuvwxyz23456789"
VUELTAS = 100000


def temporal():
    s = "".join(secrets.choice(LETRAS) for _ in range(10))
    return f"{s[:5]}-{s[5:]}"


def cifrar(clave):
    sal = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", clave.encode(), sal, VUELTAS, 32)
    return f"pbkdf2${VUELTAS}${base64.b64encode(sal).decode()}${base64.b64encode(h).decode()}"


def sql(email, rol, nombre=""):
    t = temporal()
    q = (f"INSERT INTO usuarios (email, nombre, rol, activo, clave, cambiar_clave, intentos) "
         f"VALUES ('{email}', '{nombre}', '{rol}', 1, '{cifrar(t)}', 1, 0) "
         f"ON CONFLICT(email) DO UPDATE SET rol = excluded.rol, activo = 1, clave = excluded.clave, "
         f"cambiar_clave = 1, intentos = 0, bloqueado_hasta = NULL;")
    return t, q


if __name__ == "__main__":
    email = sys.argv[1].strip().lower()
    rol = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] in ("admin", "editor") else "admin"
    t, q = sql(email, rol)
    print(f"-- Contraseña temporal para {email}: {t}", file=sys.stderr)
    print(q)
