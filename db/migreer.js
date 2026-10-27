// Migraties uitvoeren.
//
//   npm run db:migreer   alles wat nog niet gelopen heeft uitvoeren
//   npm run db:terug     de laatste migratie terugdraaien
//   npm run db:reset     alles terugdraaien en opnieuw opbouwen
//
// Umzug houdt in de tabel `migraties` bij welke bestanden al gelopen
// hebben. Daardoor kan dit commando veilig twee keer worden gestart.

import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "../kern/db.js";
import { OMGEVING } from "../kern/config.js";

export const umzug = new Umzug({
  migrations: {
    glob: "db/migraties/*.js",
    resolve: ({ name, path, context }) => ({
      name,
      up: async () => {
        const migratie = await import(`file://${path}`);
        return migratie.up({ context });
      },
      down: async () => {
        const migratie = await import(`file://${path}`);
        return migratie.down({ context });
      },
    }),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: "migraties" }),
  logger: console,
});

async function main() {
  const opdracht = process.argv[2] ?? "--vooruit";

  if (opdracht === "--reset") {
    if (OMGEVING === "production") {
      throw new Error("db:reset mag niet in productie, dat gooit alle data weg.");
    }
    await umzug.down({ to: 0 });
    await umzug.up();
  } else if (opdracht === "--terug") {
    await umzug.down();
  } else {
    await umzug.up();
  }

  await sequelize.close();
}

// Alleen uitvoeren als dit bestand zelf gestart is, niet bij importeren
// vanuit een test.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((fout) => {
    console.error("Migreren mislukt:", fout.message);
    process.exitCode = 1;
  });
}
