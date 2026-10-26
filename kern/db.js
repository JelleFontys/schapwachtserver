// Verbindingspool naar MySQL en een paar hulpjes om queries te doen.
//
// Alleen de bestanden in routes/ en db/ gebruiken deze functies.
// Er zit geen ORM tussen: de SQL die draait is de SQL die je schrijft.

import mysql from "mysql2/promise";

import { DATABASE_URL, OMGEVING } from "./config.js";

// node --watch herstart de server bij elke wijziging. Zonder deze
// bewaarplek op globalThis komt er dan elke keer een nieuwe pool bij
// en raakt MySQL door zijn verbindingen heen.
const globaal = globalThis;

export const pool =
  globaal.schapwachtPool ??
  mysql.createPool({
    uri: DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    // Datums als tekst teruggeven. Een houdbaarheidsdatum heeft geen
    // tijd en geen tijdzone; als JavaScript er een Date van maakt kan
    // hij een dag verschuiven.
    dateStrings: ["DATE"],
  });

if (OMGEVING !== "production") {
  globaal.schapwachtPool = pool;
}

/** Voert een query uit en geeft de rijen terug. */
export async function query(sql, waarden = []) {
  const [rijen] = await pool.execute(sql, waarden);
  return rijen;
}

/** Voert een query uit die hooguit één rij oplevert. */
export async function queryEen(sql, waarden = []) {
  const rijen = await query(sql, waarden);
  return rijen[0] ?? null;
}

/**
 * Voert een reeks queries uit binnen één transactie.
 * Gaat er iets mis, dan wordt alles teruggedraaid.
 */
export async function inTransactie(werk) {
  const verbinding = await pool.getConnection();
  try {
    await verbinding.beginTransaction();
    const resultaat = await werk(verbinding);
    await verbinding.commit();
    return resultaat;
  } catch (fout) {
    await verbinding.rollback();
    throw fout;
  } finally {
    verbinding.release();
  }
}

/** Controleert of de database antwoordt. */
export async function databaseLeeft() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
