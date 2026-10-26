// Migratierunner.
//
// Draait de .sql-bestanden uit db/migrations op volgorde van bestandsnaam
// en houdt in de tabel `migratie` bij welke al gedraaid zijn. Een migratie
// die er al in staat wordt overgeslagen, dus dit commando kan altijd
// opnieuw. Elke migratie draait in één transactie: gaat er iets mis, dan
// wordt dat bestand helemaal teruggedraaid.
//
//   npm run db:migrate    migraties uitvoeren
//   npm run db:reset      alles weggooien en opnieuw opbouwen

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

import { DATABASE_URL } from "../kern/config.js";

const migratieMap = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");
const resetGevraagd = process.argv.includes("--reset");

/**
 * Splitst een bestand op in losse opdrachten.
 * Puntkomma's binnen tekst tussen aanhalingstekens tellen niet mee.
 */
function splitsOpdrachten(sql) {
  const opdrachten = [];
  let huidig = "";
  let inTekst = null;

  for (let i = 0; i < sql.length; i++) {
    const teken = sql[i];

    if (inTekst) {
      if (teken === "\\") {
        huidig += teken + (sql[i + 1] ?? "");
        i++;
        continue;
      }
      if (teken === inTekst) inTekst = null;
    } else if (teken === "'" || teken === '"' || teken === "`") {
      inTekst = teken;
    } else if (teken === ";") {
      if (huidig.trim()) opdrachten.push(huidig.trim());
      huidig = "";
      continue;
    }

    huidig += teken;
  }

  if (huidig.trim()) opdrachten.push(huidig.trim());
  return opdrachten;
}

async function main() {
  const db = await mysql.createConnection({ uri: DATABASE_URL });

  try {
    if (resetGevraagd) {
      const databaseNaam = db.config.database;
      console.log(`Database ${databaseNaam} leeggooien…`);
      await db.query("SET FOREIGN_KEY_CHECKS = 0");
      const [tabellen] = await db.query(
        "SELECT table_name AS naam FROM information_schema.tables WHERE table_schema = ?",
        [databaseNaam],
      );
      for (const { naam } of tabellen) {
        await db.query(`DROP TABLE IF EXISTS \`${naam}\``);
      }
      await db.query("SET FOREIGN_KEY_CHECKS = 1");
      console.log(`  ${tabellen.length} tabellen verwijderd`);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS migratie (
        bestand     VARCHAR(190) NOT NULL PRIMARY KEY,
        gedraaid_op DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4
    `);

    const [gedraaid] = await db.query("SELECT bestand FROM migratie");
    const alGedaan = new Set(gedraaid.map((rij) => rij.bestand));

    const bestanden = (await fs.readdir(migratieMap))
      .filter((naam) => naam.endsWith(".sql"))
      .sort();

    let nieuw = 0;
    for (const bestand of bestanden) {
      if (alGedaan.has(bestand)) {
        console.log(`  overgeslagen  ${bestand}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migratieMap, bestand), "utf8");
      const opdrachten = splitsOpdrachten(sql);

      await db.beginTransaction();
      try {
        for (const opdracht of opdrachten) {
          await db.query(opdracht);
        }
        await db.query("INSERT INTO migratie (bestand) VALUES (?)", [bestand]);
        await db.commit();
        console.log(`  uitgevoerd    ${bestand}  (${opdrachten.length} opdrachten)`);
        nieuw++;
      } catch (fout) {
        await db.rollback();
        console.error(`  MISLUKT       ${bestand}`);
        throw fout;
      }
    }

    console.log(
      nieuw === 0
        ? "Database was al bij: niets te doen."
        : `Klaar: ${nieuw} migratie(s) uitgevoerd.`,
    );
  } finally {
    await db.end();
  }
}

main().catch((fout) => {
  console.error(fout.message);
  process.exitCode = 1;
});
