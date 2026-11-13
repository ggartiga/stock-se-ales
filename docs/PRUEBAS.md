# Pruebas

Tres niveles complementarios. Los datos de prueba son **ficticios** y están marcados (`es_prueba = true`,
almacenes con sufijo `[PRUEBA]`, códigos SAP con prefijo `PRB-`, usuarios del dominio `.test`).

## 1. Unitarias — `npm test`

`tests/unit/*.test.ts` (runner nativo `node:test` vía `tsx`). Cubren `src/lib/dominio` y `src/lib/filtros`:

- Estado del stock (sin stock / igual al mínimo / bajo / disponible) y resumen.
- Validación de cantidades a retirar: vacío, cero, negativos, decimales, mayor al stock, stock 0.
- Validaciones de código SAP, códigos de almacén/ubicación, textos, correo, contraseña.
- Contenido QR: construcción, lectura de URL / formato corto / UUID, rechazo de QR ajenos o maliciosos.
- Fechas en `America/Santiago`, incluidos los días de cambio de horario (inicio y fin del horario de verano).
- Traducción de errores (sin exponer mensajes técnicos), redirecciones seguras, permisos y menú
  (las opciones pendientes no tienen enlace).
- Filtros de URL: valores manipulados se descartan; escape de texto para PostgREST.

## 2. Base de datos — `npm run test:db`

`tests/db/ejecutar.sh` crea un PostgreSQL **temporal** (no toca ninguna base real), aplica una simulación mínima de
Supabase (`auth.users`, `auth.uid()`, roles `anon/authenticated/service_role` con los privilegios por defecto de
Supabase), las **migraciones reales** y el seed, y ejecuta:

| Archivo | Verifica |
|---|---|
| `20_usuarios_roles.sql` | Alta automática de perfiles, primer admin, rol desde `app_metadata`, `user_metadata` ignorado, último admin protegido, usuario desactivado sin acceso, anónimo sin acceso |
| `30_rls_permisos.sql` | Qué puede y no puede cada rol; stock sólo por movimiento; QR no alterable; integridad referencial; `service_role` no escribe historial |
| `40_busqueda_qr.sql` | Búsqueda por SAP/elemento/descripción, filtros, escape de comodines, QR A1 → sólo sus 3 productos, A2 reemplaza el filtro, A1 de SEAT ≠ A1 de LF |
| `50_retiros.sql` | Retiro 5 → 4, registro de trabajador/correo/id/fecha del servidor, copia histórica, idempotencia, cantidades inválidas, stock insuficiente, retiro total → 0 (“sin stock”), **atomicidad** (fallo simulado al registrar el movimiento ⇒ stock intacto), ubicación inactiva |
| `60_historial.sql` | Trabajador ve sólo lo propio, supervisor todo, orden descendente, filtro por fecha, nadie modifica ni borra (ni `service_role`), el nombre histórico se conserva |
| `70_productos_admin.sql` | Crear con stock inicial (INGRESO trazado), editar, varias ubicaciones con cantidades independientes, eliminar → archivar si hay historial, eliminar físico si no, SAP duplicado, creación atómica |
| `concurrencia.sh` | **200 retiros simultáneos** (20 clientes `pgbench`) sobre stock 100 ⇒ exactamente 100 éxitos, stock final 0, sin lecturas obsoletas; **doble envío simultáneo** de la misma solicitud ⇒ un solo descuento |
| `91_verificar_limpieza.sql` | `limpiar_datos_prueba.sql` elimina sólo los datos ficticios |

Requiere PostgreSQL 15+ instalado localmente (`initdb`, `pg_ctl`, `psql`, `pgbench`).
Si se ejecuta como root (contenedores), el script se relanza como el usuario `postgres`.

## 3. End-to-end — `npm run test:e2e`

`tests/e2e/flujo-completo.spec.ts` con Playwright en perfiles **Pixel 7, iPhone 14 y escritorio**:
login (incluye credenciales erróneas y redirección sin sesión), tarjetas y estados, búsquedas y filtros, consulta por
QR (A1, A2, otro almacén, QR desconocido), retiro completo con validaciones y doble clic, verificación en el historial
del nombre y correo del trabajador, restricciones de permisos y alta/eliminación de producto por un administrador.

Preparación:

```bash
npx supabase start && npx supabase db reset
npm run usuarios:prueba
npm run dev            # en otra terminal
npx playwright install # sólo la primera vez
npm run test:e2e
```

La lectura con cámara se prueba manualmente en dispositivos reales (los navegadores automatizados no tienen
cámara); el flujo posterior al escaneo (`/escanear?u=…`) sí está automatizado.

## Lista de verificación manual en dispositivos

- [ ] Android (Chrome) e iPhone (Safari): el lector QR abre la cámara trasera y reconoce una etiqueta impresa.
- [ ] Escanear con la cámara nativa del teléfono abre la app en el rack correcto (pide login si no hay sesión).
- [ ] La linterna aparece en equipos compatibles.
- [ ] Sin permiso de cámara: mensaje claro y selección manual disponible.
- [ ] No hay desplazamiento horizontal en 360 px de ancho; los botones se pulsan cómodamente con el pulgar.
- [ ] Impresión de etiquetas QR en A4 (2 por fila) legibles a 1 m de distancia.
