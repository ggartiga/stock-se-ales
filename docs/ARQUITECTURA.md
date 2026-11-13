# Arquitectura de STOCK SEÑALES

## 1. Vista general

```
 Teléfono / tablet / PC (navegador)
 ┌─────────────────────────────────────────────┐
 │ Next.js (React)                             │
 │  · Server Components: leen datos con la     │
 │    sesión del usuario (RLS aplica)          │
 │  · Client Components: búsqueda, lector QR,  │
 │    formulario de retiro                     │
 └───────────────┬─────────────────────────────┘
                 │ HTTPS · cookie de sesión (JWT)
 ┌───────────────▼─────────────────────────────┐
 │ Servidor Next.js (Vercel u otro)            │
 │  · proxy.ts: valida sesión, protege rutas   │
 │  · Server Actions: validan y llaman a la BD │
 │  · Clave secreta SÓLO aquí (alta usuarios)  │
 └───────────────┬─────────────────────────────┘
                 │ PostgREST / Auth API
 ┌───────────────▼─────────────────────────────┐
 │ Supabase                                    │
 │  · Auth (cuentas, contraseñas, invitaciones)│
 │  · PostgreSQL: tablas + RLS + funciones     │
 │    SECURITY DEFINER transaccionales         │
 └─────────────────────────────────────────────┘
```

**Principio:** la base de datos es la autoridad. La interfaz oculta lo que un rol no puede hacer, pero la
autorización real la aplican RLS, los privilegios de columna y las funciones SQL. Una petición manipulada desde el
navegador no puede saltarse estas reglas.

## 2. Modelo de datos

```
auth.users 1─1 usuarios ─┐
                         │ (usuario_id)
almacenes 1─N ubicaciones 1─N inventario N─1 productos
                                   │
                                   └─1─N movimientos (copia histórica de trabajador,
                                                      producto, almacén y ubicación)
```

| Tabla | Propósito | Claves y restricciones principales |
|---|---|---|
| `usuarios` | Perfil y rol de cada cuenta | PK = `auth.users.id`; correo único; rol enum; `activo` |
| `almacenes` | Almacenes (LF, SEAT, FL…) | código y nombre únicos; formato de código; estado |
| `ubicaciones` | Racks dentro de un almacén | `identificador_qr` UUID **único global**; `(almacen_id, codigo_ubicacion)` único |
| `productos` | Catálogo | `codigo_sap` único y con formato; `activo` (archivado) |
| `inventario` | Existencias producto × ubicación | `(producto_id, ubicacion_id)` único; `cantidad_actual ≥ 0`; `cantidad_minima ≥ 0` |
| `movimientos` | Historial inmutable | `solicitud_id` único (idempotencia); `cantidad > 0`; coherencia `anterior ± cantidad = nuevo`; FK `RESTRICT` |

Además: vista `v_inventario` (con `security_invoker`, calcula `estado_stock`), índices por ubicación, producto,
fecha y trigramas (`pg_trgm`) para búsquedas `ILIKE`.

**Estado del stock** (idéntico en SQL y TypeScript): `0` → *Sin stock*; `≤ mínimo` → *Stock bajo*
(incluye el caso “igual al mínimo” del requerimiento y también valores por debajo); `> mínimo` → *Disponible*.

**Trazabilidad histórica:** cada movimiento guarda copia de `trabajador`, `correo_trabajador`, `codigo_sap`,
`elemento`, `almacen_nombre` y `codigo_ubicacion`. Si luego cambia el perfil o el producto, el historial conserva
lo que era cierto al momento del movimiento.

## 3. Flujo de retiro (transaccional)

```
[RETIRAR] → cantidad (validación inmediata) → [Continuar] → ¿Confirma? → [CONFIRMAR RETIRO]
      │  id de solicitud (UUID) generado al abrir el formulario
      ▼
supabase.rpc('registrar_retiro', { inventario, cantidad, solicitud, observación })
      ▼   ── UNA transacción PostgreSQL ──────────────────────────────────────
      1. auth.uid() → perfil activo (nombre y correo desde la BD, no del cliente)
      2. SELECT … FROM inventario WHERE id = … FOR UPDATE      ← bloqueo de fila
      3. ¿Ya existe un movimiento con esa solicitud? → devolverlo (no descuenta dos veces)
      4. Validar cantidad > 0, producto activo, ubicación activa, cantidad ≤ stock
      5. UPDATE inventario SET cantidad_actual = anterior − cantidad
      6. INSERT movimiento (fecha_hora = now() del servidor)
      ── si cualquier paso falla, PostgreSQL revierte TODO ──
      ▼
Pantalla de éxito (anterior → nuevo) → refresco de datos → vuelta al inventario
```

Protección contra dobles retiros, en tres capas:

1. **Interfaz:** el botón se bloquea al primer toque (estado + referencia síncrona).
2. **Idempotencia:** la misma solicitud reenviada (doble toque, reintento tras corte de red) devuelve el movimiento
   original. Si dos copias llegan a la vez, la segunda espera el bloqueo y luego ve la primera confirmada.
3. **Concurrencia real:** dos trabajadores retirando el último repuesto a la vez → el bloqueo de fila los serializa;
   el segundo recibe “Stock insuficiente” y la interfaz se refresca con el stock real.

## 4. QR de ubicaciones

- Cada ubicación tiene `identificador_qr` (UUID aleatorio, único en todo el sistema, no editable desde la API).
- El QR codifica `https://<sitio>/escanear?u=<identificador_qr>`. Así funciona tanto con el lector de la app como con
  la cámara nativa del teléfono, y dos racks “A1” de almacenes distintos nunca se confunden.
- El lector acepta además `STOCKSENALES:UBI:<uuid>` o el UUID solo, y rechaza cualquier otro contenido.
- `/escanear?u=…` muestra **sólo** el inventario de esa ubicación; escanear otro QR reemplaza el parámetro, por lo
  que el filtro anterior se limpia.
- Lector: `BarcodeDetector` nativo cuando existe (Android/Chrome); `jsQR` cargado bajo demanda como respaldo
  (iPhone/Safari). Cámara trasera, linterna si el equipo la soporta, se apaga al salir de la página.

## 5. Autenticación y roles

- Supabase Auth con correo y contraseña; sesión en cookies `httpOnly` gestionada por `@supabase/ssr`.
- `src/proxy.ts` valida la sesión en cada petición (`auth.getUser()`) y redirige a `/login` si no existe.
- Al crear una cuenta, un trigger crea su perfil en `usuarios`. El rol **nunca** se toma de `user_metadata`
  (editable por el usuario); sólo de `app_metadata` (servidor) o de la RPC de administración.
- La **primera** cuenta creada queda como administradora (arranque). Siempre debe existir un administrador activo.
- Registro público deshabilitado: las cuentas las crea un administrador (invitación o contraseña temporal).

| Rol | Puede |
|---|---|
| Trabajador | Consultar inventario, escanear, retirar, ver **sus** movimientos |
| Supervisor | Lo anterior + ver el historial de **todos** y la lista de usuarios |
| Administrador | Todo: productos, almacenes, ubicaciones, QR, usuarios y roles |

## 6. Organización del código

- `src/lib/dominio/*`: reglas puras sin dependencias (probadas con `node:test`).
- `src/lib/consultas.ts`: lecturas del servidor; `src/app/**/acciones.ts`: Server Actions (escrituras).
- Formularios con `useActionState` + `BotonEnviar` (deshabilitado mientras envía).
- Filtros en la URL (`?q=…&estado=…`): compartibles, compatibles con “atrás” y re-consultan la BD.
- Errores: las funciones SQL lanzan mensajes en español con un código en `hint`; `mensajeDeError()` los traduce y
  nunca muestra mensajes técnicos. `registrarError()` deja registro JSON en los logs del servidor.

## 7. Extensión futura

La sección **Más acciones** ya lista las funciones previstas. La base de datos está preparada:

- **Ingreso de stock:** existe la RPC `registrar_ingreso` (sólo administradores). Falta su pantalla: reutilizar
  `ModalRetiro` cambiando la RPC.
- **Ajustes de inventario:** el tipo `AJUSTE` y la regla de coherencia existen; falta una RPC `registrar_ajuste`
  (con motivo obligatorio) y su pantalla.
- **Reportes:** consultas agregadas sobre `movimientos` (consumo por producto, por trabajador, por período).
- **Traslados entre ubicaciones:** RETIRO + INGRESO en una sola RPC.
