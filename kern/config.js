import "dotenv/config";

function verplicht(naam) {
  const waarde = process.env[naam];
  if (waarde === undefined || waarde === "") {
    throw new Error(`Omgevingsvariabele ${naam} ontbreekt.`);
  }
  return waarde;
}

export const OMGEVING = process.env.NODE_ENV ?? "development";
export const IS_TEST = OMGEVING === "test";
export const PORT = Number(process.env.PORT ?? 3000);

export const DATABASE_URL = IS_TEST
  ? (process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "mysql://geen:database@localhost:1/schapwacht_test")
  : verplicht("DATABASE_URL");

export const HERKOMSTEN = (
  process.env.CLIENT_URL ?? "http://localhost:5173"
)
  .split(",")
  .map((adres) => adres.trim())
  .filter(Boolean);

export const JWT_SECRET = IS_TEST
  ? (process.env.JWT_SECRET ?? "sleutel-alleen-voor-tests")
  : verplicht("JWT_SECRET");
