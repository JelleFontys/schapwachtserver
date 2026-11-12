import { Sequelize } from "sequelize";

import { DATABASE_URL, OMGEVING } from "./config.js";

const globaal = globalThis;

export const sequelize =
  globaal.schapwachtDb ??
  new Sequelize(DATABASE_URL, {
    dialect: "mysql",
    logging: OMGEVING === "development" ? console.log : false,
    pool: { max: 10, min: 0, idle: 10_000 },
    define: {
      underscored: true,
      freezeTableName: true,
      createdAt: "aangemaakt_op",
      updatedAt: "bijgewerkt_op",
    },
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
    timezone: "+00:00",
  });

if (OMGEVING !== "production") {
  globaal.schapwachtDb = sequelize;
}

export async function databaseLeeft() {
  try {
    await sequelize.authenticate();
    return true;
  } catch {
    return false;
  }
}
