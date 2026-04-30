# Usuarios de acceso rápido (desarrollo)

Referencia de las credenciales por defecto usadas en los **atajos de login por rol** de la pantalla de inicio de sesión.

**Fuente de verdad en código:** `lib/loginRolePresets.ts` (`DEFAULTS`). Si este documento y el código difieren, prevalece el archivo TypeScript.

**Sobrescritura:** se pueden cambiar con `NEXT_PUBLIC_BODEGA_DEV_LOGINS` (JSON) o con variables `NEXT_PUBLIC_LOGIN_<ROL>_EMAIL` / `NEXT_PUBLIC_LOGIN_<ROL>_PASSWORD`. Ver sección 9.5 del `README.md` principal.

**Advertencia:** contraseñas débiles solo para entornos de prueba local o de equipo. No uses estas cuentas ni este patrón en producción ni en repositorios públicos con datos reales.

## Tabla de usuarios y claves

| Rol (etiqueta) | Email | Contraseña |
|----------------|-------|--------------|
| Custodio | custodio@custodio.com | custodio123 |
| Operario | operario@operario.com | operario123 |
| Procesador | procesador@procesador.com | procesador123 |
| Jefe | jefe@jefe.com | jefe123 |
| Administrador | admin@admin.com | admin123 |
| Cuenta | adminmit@mit.com | adminmit123 |
| Configurador | configurador@configurador.com | configurador123 |
| Operador | operadormit@operadormit.com | 123456789 |
| Transporte | transporte@transporte.com | transporte123 |

Los botones de acceso rápido solo aparecen en **desarrollo** (`NODE_ENV === "development"`) o si defines `NEXT_PUBLIC_ENABLE_LOGIN_ROLE_SHORTCUTS=1`.

Cada usuario debe existir en **Firebase Authentication** del proyecto con el mismo correo y contraseña para que el inicio de sesión funcione.
