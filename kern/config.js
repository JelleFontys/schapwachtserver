// Omgevingsinstellingen, één keer ingelezen en gecontroleerd.
//
// Lokaal komen de waarden uit .env. In Dokploy staat dat bestand er
// niet en komen ze uit het Environment-gedeelte van de applicatie.

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

/**
 * Welke database gebruiken we?
 *
 * Tests praten met hun eigen database, zodat ze nooit de
 * ontwikkelgegevens overschrijven. Is die niet ingesteld, dan valt de
 * test terug op een adres dat nergens naartoe gaat. Dat is expres:
 * unittests raken de database niet, en een test die hem wél nodig
 * heeft hoort te falen op de verbinding. Dat wijst je naar het
 * probleem, terwijl omvallen bij het opstarten alleen zegt dat er
 * iets mist.
 */
export const DATABASE_URL = IS_TEST
  ? (process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "mysql://geen:database@localhost:1/schapwacht_test")
  : verplicht("DATABASE_URL");

/**
 * Welke adressen mogen de API aanroepen.
 * Meerdere scheiden met een komma, zodat er naast het echte domein
 * ook een testomgeving bij kan.
 */
export const HERKOMSTEN = (
  process.env.CLIENT_URL ?? "http://localhost:5173"
)
  .split(",")
  .map((adres) => adres.trim())
  .filter(Boolean);

export const JWT_SECRET = IS_TEST
  ? (process.env.JWT_SECRET ?? "sleutel-alleen-voor-tests")
  : verplicht("JWT_SECRET");
