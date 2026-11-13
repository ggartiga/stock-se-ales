/**
 * Crea usuarios FICTICIOS de prueba (dominio .test) para desarrollo y e2e.
 *   npm run usuarios:prueba
 * Por seguridad sólo se ejecuta contra un Supabase local (localhost/127.0.0.1)
 * salvo que se pase --forzar.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SECRET_KEY;
if (!url || !clave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1/.test(url) && !process.argv.includes("--forzar")) {
  console.error(`Rechazado: ${url} no es un Supabase local. Use --forzar sólo en un entorno de pruebas.`);
  process.exit(1);
}

const CLAVE = process.env.E2E_TRABAJADOR_CLAVE ?? "Prueba#2026";
const USUARIOS = [
  { correo: process.env.E2E_ADMIN_CORREO ?? "admin.prueba@stock-senales.test", nombre: "Ana Administradora (PRUEBA)", rol: "administrador" },
  { correo: "supervisor.prueba@stock-senales.test", nombre: "Sergio Supervisor (PRUEBA)", rol: "supervisor" },
  { correo: process.env.E2E_TRABAJADOR_CORREO ?? "trabajador.prueba@stock-senales.test", nombre: "Tomás Trabajador (PRUEBA)", rol: "trabajador" },
];

const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });

async function principal() {
  for (const u of USUARIOS) {
    const { error } = await supabase.auth.admin.createUser({
      email: u.correo,
      password: CLAVE,
      email_confirm: true,
      user_metadata: { nombre_completo: u.nombre },
      // El rol va en app_metadata (no editable por el usuario); el trigger de la BD lo aplica.
      app_metadata: { rol: u.rol },
    });
    if (error) {
      console.log(`· ${u.correo}: ${/already|registered|exists/i.test(error.message) ? "ya existía" : error.message}`);
      continue;
    }
    console.log(`✔ ${u.correo} (${u.rol})`);
  }
  console.log(`\nContraseña de todos los usuarios de prueba: ${CLAVE}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
