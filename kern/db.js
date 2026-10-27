// Verbinding met MySQL via Sequelize.
//
// Sequelize zet alle waarden als parameters in de query, dus SQL-injectie
// kan niet via de modellen. Schrijf daarom nooit zelf een query met
// sjabloonstrings, maar gebruik de modellen uit modellen/.

import { Sequelize } from "sequelize";

import { DATABASE_URL, OMGEVING } from "./config.js";

// node --watch herstart de server bij elke wijziging. Zonder deze
// bewaarplek op globalThis komt er dan elke keer een nieuwe verbinding
// bij en raakt MySQL door zijn verbindingen heen.
const globaal = globalThis;

export const sequelize =
  globaal.schapwachtDb ??
  new Sequelize(DATABASE_URL, {
    dialect: "mysql",
    // Alleen loggen tijdens ontwikkelen; in productie staan de queries
    // anders in je logbestanden, inclusief de waarden erin.
    logging: OMGEVING === "development" ? console.log : false,
    pool: { max: 10, min: 0, idle: 10_000 },
    define: {
      // Tabel- en kolomnamen in snake_case, zoals in de database.
      underscored: true,
      freezeTableName: true,
      createdAt: "aangemaakt_op",
      updatedAt: "bijgewerkt_op",
    },
    dialectOptions: {
      // Een houdbaarheidsdatum heeft geen tijd en geen tijdzone. Als
      // JavaScript er een Date van maakt kan hij een dag verschuiven,
      // dus we houden hem als tekst: "2026-03-12".
      dateStrings: true,
      typeCast: true,
    },
    timezone: "+00:00",
  });

if (OMGEVING !== "production") {
  globaal.schapwachtDb = sequelize;
}

/** Controleert of de database antwoordt. */
export async function databaseLeeft() {
  try {
    await sequelize.authenticate();
    return true;
  } catch {
    return false;
  }
}
