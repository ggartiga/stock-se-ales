# Seguridad

## Capas de protección

| Capa | Mecanismo |
|---|---|
| Transporte | HTTPS obligatorio (requerido también por la cámara); HSTS |
| Sesión | Supabase Auth; cookies `httpOnly`; `proxy.ts` valida el token con `auth.getUser()` en cada petición |
| Rutas | Sin sesión sólo `/login` y `/auth/*`; páginas de admin exigen rol en el servidor (`requerirRol`) |
| Datos | **Row Level Security** en las 6 tablas + privilegios de tabla y **de columna** |
| Reglas de negocio | Funciones SQL `SECURITY DEFINER` con `search_path = ''`, validaciones y bloqueo de fila |
| Historial | Sin privilegios de escritura + trigger que bloquea UPDATE/DELETE/TRUNCATE para los roles de la API |
| Entradas | Validación en cliente, en Server Actions y otra vez en PostgreSQL (CHECK, FK, UNIQUE, funciones) |
| Encabezados | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (cámara sólo propia) |

## Matriz de permisos (aplicada en la base de datos)

| Operación | Trabajador | Supervisor | Administrador | Anónimo |
|---|:-:|:-:|:-:|:-:|
| Ver inventario, almacenes, ubicaciones | ✔ | ✔ | ✔ | ✘ |
| Retirar (`registrar_retiro`) | ✔ | ✔ | ✔ | ✘ |
| Ingresar stock (`registrar_ingreso`) | ✘ | ✘ | ✔ | ✘ |
| Crear / editar / eliminar productos, almacenes, ubicaciones | ✘ | ✘ | ✔ | ✘ |
| Cambiar `cantidad_actual` directamente | ✘ | ✘ | ✘ (sólo por movimiento) | ✘ |
| Ver historial | propio | todos | todos | ✘ |
| Modificar o borrar historial | ✘ | ✘ | ✘ | ✘ |
| Ver usuarios | propio | todos | todos | ✘ |
| Cambiar roles / desactivar cuentas | ✘ | ✘ | ✔ (siempre queda ≥ 1 admin) | ✘ |

Un usuario **desactivado** pierde todo acceso aunque conserve un token válido: las políticas usan
`es_usuario_activo()`.

## Escenarios de manipulación considerados

- **Trabajador edita la petición del retiro** para enviar otro nombre o correo → ignorado: la función toma el perfil
  desde `auth.uid()`.
- **Inserta un movimiento falso** vía API (`POST /rest/v1/movimientos`) → *permission denied* (sin privilegio INSERT).
- **Cambia el stock** con `PATCH /rest/v1/inventario` → sin privilegio sobre la columna; y aunque fuera admin, el
  trigger exige que todo cambio de stock pase por un movimiento.
- **Se asigna rol administrador** vía `user_metadata` al registrarse o con `auth.updateUser` → el rol nunca se lee de
  ahí; además el registro público está desactivado.
- **Borra historial** con la clave secreta filtrada → el trigger también bloquea a `service_role`. Sólo el propietario
  de la BD (consola de Supabase) puede hacerlo.
- **Llama funciones internas** (`privado.aplicar_movimiento`) → el esquema `privado` no está expuesto ni concedido.
- **Redirección abierta** con `?siguiente=//sitio-externo` → `rutaInternaSegura()` sólo acepta rutas internas.
- **Inyección en búsquedas** → la búsqueda de inventario es una función SQL parametrizada que escapa comodines; en
  los filtros `or()` de PostgREST se eliminan los caracteres sintácticos.
- **Doble retiro / carrera** → idempotencia por `solicitud_id` + `SELECT … FOR UPDATE` (ver ARQUITECTURA.md).

## Credenciales

- La **clave pública** (publishable/anon) puede estar en el navegador: sin sesión válida no da acceso a nada (RLS).
- La **clave secreta** sólo existe en el servidor (`SUPABASE_SECRET_KEY`, sin prefijo `NEXT_PUBLIC_`) y en un único
  módulo marcado `server-only`, usado exclusivamente para crear/invitar cuentas tras verificar que quien llama es
  administrador.
- `.env.local` está en `.gitignore`. Rote las claves en Supabase si se exponen.
- Las contraseñas las gestiona Supabase Auth (hash bcrypt); la app nunca las registra en logs.

## Registro de errores

`src/lib/registro.ts` escribe JSON estructurado (`contexto`, `mensaje`, `codigo`, `hint`, `fecha`) en los logs del
servidor y la consola. No incluye contraseñas ni tokens. Es el punto único para conectar un servicio externo
(p. ej. Sentry) si se requiere.

## Recomendaciones adicionales para producción

- Activar MFA para administradores en Supabase Auth.
- Restringir el acceso al Dashboard de Supabase a pocas personas (el propietario de la BD puede todo).
- Revisar periódicamente *Advisors → Security* en Supabase.
