# Despliegue en producción

Arquitectura recomendada: **Supabase Cloud** (base de datos + Auth) y **Vercel** (aplicación Next.js), ambos con
HTTPS (obligatorio para la cámara). Cualquier hosting compatible con Node.js 20+ también sirve (`npm run build && npm start`).

## 1. Supabase

1. Cree un proyecto en https://supabase.com (región cercana, p. ej. *South America (São Paulo)*).
2. Aplique las migraciones (elija una opción):
   - **CLI (recomendado):**
     ```bash
     npx supabase login
     npx supabase link --project-ref <ref-del-proyecto>
     npx supabase db push          # aplica supabase/migrations/* en orden
     ```
   - **Manual:** en *SQL Editor*, ejecute en orden los 4 archivos de `supabase/migrations/`.
   - **No** ejecute `seed.sql` en producción (son datos ficticios). Si lo hizo, use `supabase/limpiar_datos_prueba.sql`.
3. *Authentication → Sign In / Providers → Email*: desactive **Allow new users to sign up**.
4. *Authentication → URL Configuration*:
   - **Site URL:** `https://<su-dominio>`
   - **Redirect URLs:** `https://<su-dominio>/auth/confirmar**` (el `**` permite los parámetros del enlace)
5. *Authentication → Emails → Templates*: reemplace **Invite user** y **Reset password** por el contenido de
   `supabase/plantillas/invitacion.html` y `recuperacion.html`. Estas plantillas envían a `/auth/confirmar` con
   `token_hash`, lo que funciona aunque el trabajador abra el correo en otro dispositivo.
6. *Authentication → Emails → SMTP Settings*: configure el SMTP corporativo. El SMTP incluido en Supabase está
   limitado a pocos correos por hora y sólo sirve para pruebas. Mientras tanto puede crear usuarios con
   **contraseña temporal** desde la app.
7. *Project Settings → API Keys*: copie la **Publishable key** y la **Secret key**.

### Primer administrador

La **primera** cuenta que se cree queda automáticamente como administradora:

- *Authentication → Users → Add user → Create new user* (marque *Auto Confirm User*), con su correo y contraseña.
- Opcional: en *SQL Editor* fije su nombre:
  `update public.usuarios set nombre_completo = 'Nombre Apellido' where correo = 'su.correo@empresa.cl';`

Desde ahí, el resto de las cuentas se crean en la app: **Más acciones → Usuarios y roles**.

## 2. Vercel

1. Suba el repositorio a GitHub/GitLab e impórtelo en https://vercel.com (framework: Next.js).
2. Variables de entorno (*Settings → Environment Variables*):

   | Variable | Valor | Exposición |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | pública |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key | pública |
   | `NEXT_PUBLIC_SITE_URL` | `https://<su-dominio>` | pública |
   | `SUPABASE_SECRET_KEY` | Secret key | **secreta — sin prefijo NEXT_PUBLIC_** |

3. *Deploy*. Configure el dominio definitivo y actualice *Site URL* en Supabase si cambia.

## 3. Puesta en servicio

1. Ingrese como administrador → **Administración de almacenes**: cree almacenes y ubicaciones (racks).
2. **Imprimir códigos QR** → imprima y pegue cada etiqueta en su rack. Verifique primero que
   `NEXT_PUBLIC_SITE_URL` sea la dirección definitiva: los QR la incluyen. (Si cambia el dominio más adelante, basta
   con redirigir el dominio antiguo a `/escanear` del nuevo; el identificador del rack no cambia.)
3. **Administración de productos**: cargue productos con su ubicación, stock inicial y mínimo. El stock inicial queda
   registrado como movimiento *INGRESO — Stock inicial*.
4. Cree las cuentas de los trabajadores y supervisores.
5. En los teléfonos: abra la URL y use *Agregar a pantalla de inicio* (queda como app).

### Carga masiva inicial (opcional)

Si el inventario actual está en una planilla, puede importarse con SQL por el administrador de la BD (las funciones
SQL validan todo). Ejemplo por fila:

```sql
-- Ejecutar en SQL Editor (como propietario). Reemplace los valores.
select public.crear_producto('10000023262', 'Controlador VCC', 'Descripción',
       (select u.id from ubicaciones u join almacenes a on a.id = u.almacen_id
         where a.codigo = 'LF' and u.codigo_ubicacion = 'A1'),
       2, 5, gen_random_uuid());
```

> `crear_producto` exige un administrador autenticado; en el SQL Editor ejecute antes
> `select set_config('request.jwt.claim.sub', '<id-del-admin>', false);` en la misma ejecución.

## 4. Operación

- **Copias de seguridad:** Supabase realiza respaldos diarios (plan Pro: *Point in Time Recovery* opcional).
- **Logs:** errores de servidor en Vercel → *Logs* (formato JSON con `contexto`); BD en Supabase → *Logs*.
- **Actualizaciones de esquema:** agregue nuevas migraciones con fecha posterior; nunca edite una ya aplicada.
- **Bajas de personal:** desactive la cuenta en *Usuarios y roles* (no la elimine: su historial debe conservarse).
