/**
 * migrations/migrate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Runner de migraciones para HDreams CRM.
 *
 * Cómo funciona:
 *  1. Lee todos los archivos *.sql de esta carpeta, ordenados por nombre.
 *  2. Compara contra la tabla `schema_migrations` en PostgreSQL.
 *  3. Ejecuta solo las migraciones pendientes (idempotente).
 *
 * Uso desde server.ts:
 *   import { runMigrations } from './migrations/migrate';
 *   await runMigrations(pool);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs   from "fs";
import path from "path";
import pkg  from "pg";
const { Pool } = pkg;

export type PgPool = InstanceType<typeof Pool>;

export async function runMigrations(pool: PgPool): Promise<void> {
  // Crear la tabla de control si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     VARCHAR(10) PRIMARY KEY,
      applied_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );
  `);

  // Leer versiones ya aplicadas
  const { rows } = await pool.query<{ version: string }>(
    "SELECT version FROM schema_migrations ORDER BY version"
  );
  const applied = new Set(rows.map(r => r.version));

  // Leer archivos SQL disponibles
  const migrationsDir = path.dirname(new URL(import.meta.url).pathname);
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => /^\d+.*\.sql$/.test(f))
    .sort(); // Orden lexicográfico = orden numérico (001, 002, ...)

  let ran = 0;
  for (const file of files) {
    const version = file.match(/^(\d+)/)?.[1] ?? file;
    if (applied.has(version)) {
      // Ya aplicada — saltar
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    console.log(`[migrations] Aplicando ${file}...`);

    // Ejecutar dentro de una transacción para poder rollback si falla
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      ran++;
      console.log(`[migrations] ✓ ${file} aplicado`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrations] ✗ Falló ${file}:`, err);
      throw err; // Detener el servidor si una migración falla
    } finally {
      client.release();
    }
  }

  if (ran === 0) {
    console.log("[migrations] Base de datos al día — sin migraciones pendientes.");
  } else {
    console.log(`[migrations] ${ran} migración(es) aplicada(s) exitosamente.`);
  }
}
