#!/usr/bin/env node
/**
 * migrate-passwords.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Migra los hashes SHA-256 legacy del .mockdb.json a bcrypt (12 rounds).
 *
 * IMPORTANTE: Este script NO puede recuperar contraseñas. Para usuarios que
 * tenían un hash SHA-256 desconocido, asigna la contraseña temporal "Cambiar123!"
 * y los marca con mustResetPassword = true.
 *
 * Los usuarios con hash ya bcrypt ($2b$...) no se tocan.
 *
 * Uso:
 *   node scripts/migrate-passwords.mjs
 *   node scripts/migrate-passwords.mjs --dry-run   (solo muestra, no escribe)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const bcrypt  = require("bcryptjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE   = path.join(__dirname, "..", ".mockdb.json");
const DRY_RUN   = process.argv.includes("--dry-run");
const SALT      = process.env.PASSWORD_SALT || "hdreams_salt_2026";
const TEMP_PASS = "Cambiar123!";
const BCRYPT_ROUNDS = 12;

// Contraseñas conocidas para los usuarios de seed (para migración exacta)
const KNOWN_PASSWORDS = {
  "admin@hdreams.com": "Admin123!",
};

const isLegacyHash = (h) => /^[0-9a-f]{64}$/.test(h);

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("No existe .mockdb.json — nada que migrar.");
    return;
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (!db.users || db.users.length === 0) {
    console.log("Sin usuarios en .mockdb.json.");
    return;
  }

  let migrated = 0;
  let skipped  = 0;
  let forced   = 0;

  for (const user of db.users) {
    if (!isLegacyHash(user.password_hash)) {
      console.log(`  ✓ [${user.email}] ya tiene hash bcrypt — sin cambios`);
      skipped++;
      continue;
    }

    // Intentar con contraseña conocida primero
    const knownPass = KNOWN_PASSWORDS[user.email];
    let newHash;
    let resetRequired = false;

    if (knownPass) {
      const legacy = createHash("sha256").update(knownPass + SALT).digest("hex");
      if (legacy === user.password_hash) {
        newHash = await bcrypt.hash(knownPass, BCRYPT_ROUNDS);
        console.log(`  ✅ [${user.email}] migrado con contraseña conocida`);
        migrated++;
      }
    }

    if (!newHash) {
      // Hash desconocido — asignar contraseña temporal y forzar reset
      newHash = await bcrypt.hash(TEMP_PASS, BCRYPT_ROUNDS);
      user.mustResetPassword = true;
      resetRequired = true;
      console.log(`  ⚠️  [${user.email}] hash desconocido → contraseña temporal "${TEMP_PASS}" (debe cambiarla)`);
      forced++;
    }

    if (!DRY_RUN) {
      user.password_hash = newHash;
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    console.log("\n✅ .mockdb.json actualizado");
  } else {
    console.log("\n[DRY RUN] No se escribieron cambios");
  }

  console.log(`\nResumen: ${migrated} migrados exactos, ${forced} forzados con contraseña temporal, ${skipped} ya en bcrypt`);

  if (forced > 0) {
    console.log(`\n⚠️  Usuarios con contraseña temporal "${TEMP_PASS}":`);
    db.users
      .filter(u => u.mustResetPassword)
      .forEach(u => console.log(`   - ${u.email} (${u.role})`));
    console.log("   Estos usuarios deben cambiar su contraseña en su primer login.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
