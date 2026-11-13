# STOCK SEÑALES

Sistema web de gestión y control de inventario de repuestos, componentes y equipos técnicos del **área de Señales**.
Reemplaza y mejora la aplicación anterior en Power Apps: base de datos PostgreSQL real, autenticación por trabajador,
lectura de QR de racks con la cámara del teléfono, retiros transaccionales e historial inmutable.

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 |
| **Backend / datos** | Supabase (PostgreSQL 15+, PostgREST, Auth) · funciones SQL transaccionales (RPC) |
| **Seguridad** | Supabase Auth · Row Level Security · roles · historial inmutable |
| **QR** | Cámara del dispositivo (BarcodeDetector nativo + jsQR) · etiquetas imprimibles |

## Funcionalidades

- **Inventario** con tarjetas (nombre, estado, stock actual, mínimo y botón **RETIRAR**), búsqueda por código SAP,
  elemento o descripción, filtros por almacén, ubicación y estado, e indicadores (disponible / stock bajo / sin stock).
- **Productos**: alta (con stock inicial trazado), edición, cantidad mínima por ubicación, un mismo producto en varias
  ubicaciones con cantidades independientes, y eliminación con confirmación (se **archiva** si tiene historial).
- **Almacenes y ubicaciones** (racks), cada ubicación con un **identificador QR único**.
- **Lector QR**: al escanear un rack se muestran sólo sus productos; escanear otro rack reemplaza el filtro.
  Generación e impresión de etiquetas QR. Selección manual como alternativa.
- **Retiro** con validaciones, confirmación y **transacción única en PostgreSQL** (bloqueo de fila + movimiento);
  protegido contra dobles pulsaciones y solicitudes simultáneas.
- **Historial de movimientos** con trabajador, correo, fecha/hora del servidor, stock anterior y nuevo; filtro por
  fecha, tipo y texto; más recientes primero; no modificable.
- **Usuarios y roles** (Administrador, Supervisor, Trabajador): invitación por correo o contraseña temporal.
- **Más acciones** preparada para: Ingreso de stock, Ajustes y Reportes (marcados “Próximamente”).
- Diseño **mobile-first** (barra inferior, botones de 48–64 px, hoja inferior para formularios), PWA instalable.

## Puesta en marcha local

Requisitos: **Node.js ≥ 20.9**, **Docker** (para Supabase local) y Git.

```bash
npm install
npx supabase start             # levanta PostgreSQL + Auth + API local (Docker)
npx supabase db reset          # aplica supabase/migrations/* y carga supabase/seed.sql (datos de PRUEBA)
cp .env.example .env.local     # complete con los valores que imprime `npx supabase status`
npm run usuarios:prueba        # crea admin / supervisor / trabajador ficticios (clave: Prueba#2026)
npm run dev                    # http://localhost:3000
```

En `.env.local` (valores de `npx supabase status`):

| Variable | Valor local |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *Publishable key* (o *anon key*) |
| `SUPABASE_SECRET_KEY` | *Secret key* (o *service_role key*) — **sólo servidor** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |

> **Cámara en el teléfono:** los navegadores sólo permiten la cámara en `https://` (o `localhost`). Para probar el
> lector QR desde un celular en desarrollo use un túnel HTTPS (p. ej. `npx localtunnel --port 3000` o
> `cloudflared tunnel --url http://localhost:3000`) y agregue `https://<túnel>/auth/confirmar**` en Supabase Auth → *Redirect URLs*.

Correos locales (invitaciones, recuperación): http://localhost:54324 · Panel de la BD: http://localhost:54323

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo, compilación y producción |
| `npm run typecheck` · `npm run lint` | TypeScript estricto · ESLint |
| `npm test` | Pruebas unitarias (dominio, validaciones, QR, fechas, filtros) |
| `npm run test:db` | Pruebas de BD en un PostgreSQL temporal: RLS, permisos, retiros, atomicidad, concurrencia |
| `npm run test:e2e` | Pruebas end-to-end (Playwright: Android, iPhone y escritorio) |
| `npm run usuarios:prueba` | Crea usuarios ficticios (sólo contra Supabase local) |

## Estructura

```
supabase/
  migrations/           1 esquema · 2 auth y roles · 3 lógica transaccional · 4 RLS y privilegios
  seed.sql              datos FICTICIOS (es_prueba = true)
  limpiar_datos_prueba.sql
  plantillas/           correos de invitación y recuperación
src/
  proxy.ts              protección de rutas y refresco de sesión
  app/(app)/            páginas autenticadas: inventario, escanear, historial, mas-acciones, admin/*, cuenta
  app/login, app/auth   ingreso, confirmación de enlaces, cuenta inactiva
  components/           ui, inventario, retiro, qr, historial, navegacion, admin
  lib/dominio/          reglas puras y probadas (stock, validación, QR, fechas, errores, permisos)
  lib/supabase/         clientes navegador / servidor / admin (server-only)
tests/  unit · db · e2e
docs/   ARQUITECTURA · DESPLIEGUE · SEGURIDAD · PRUEBAS
```

## Documentación

- [Arquitectura](docs/ARQUITECTURA.md) — componentes, modelo de datos, flujo de retiro, decisiones.
- [Despliegue](docs/DESPLIEGUE.md) — Supabase en la nube + Vercel, correos, primer administrador, QR.
- [Seguridad](docs/SEGURIDAD.md) — matriz de permisos, RLS, protección del historial, credenciales.
- [Pruebas](docs/PRUEBAS.md) — qué cubre cada suite y cómo ejecutarlas.
