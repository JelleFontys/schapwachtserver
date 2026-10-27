// Controle op wat er binnenkomt.
//
// Alles wat van buiten komt is onbetrouwbaar tot het gecontroleerd is.
// Deze functies gooien een 400-fout met een melding die de gebruiker
// mag zien.

import { ongeldig } from "./hulp.js";

/** Tekst die er moet staan, zonder spaties eromheen. */
export function tekst(waarde, naam, { max = 190, min = 1 } = {}) {
  if (typeof waarde !== "string") throw ongeldig(`${naam} ontbreekt.`);

  const schoon = waarde.trim();
  if (schoon.length < min) throw ongeldig(`${naam} mag niet leeg zijn.`);
  if (schoon.length > max) throw ongeldig(`${naam} mag maximaal ${max} tekens lang zijn.`);

  return schoon;
}

/** E-mailadres, altijd in kleine letters opgeslagen. */
export function email(waarde) {
  const schoon = tekst(waarde, "E-mailadres", { max: 190 }).toLowerCase();

  // Geen uitputtende controle: dat kan alleen door een mail te sturen.
  // Deze controle houdt typefouten tegen, niet een vastbesloten
  // gebruiker met een raar adres.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(schoon)) {
    throw ongeldig("Dit is geen geldig e-mailadres.");
  }

  return schoon;
}

/**
 * Wachtwoord. Niet trimmen: spaties mogen erin zitten en zijn dan deel
 * van het wachtwoord.
 *
 * De bovengrens van 72 is geen willekeurige keuze: bcrypt kijkt alleen
 * naar de eerste 72 bytes. Zonder deze controle zou alles daarna stil
 * genegeerd worden, en dan denkt iemand een lang wachtwoord te hebben
 * terwijl alleen het begin meetelt.
 */
export function wachtwoord(waarde) {
  if (typeof waarde !== "string") throw ongeldig("Wachtwoord ontbreekt.");
  if (waarde.length < 8) throw ongeldig("Een wachtwoord moet minstens 8 tekens hebben.");
  if (Buffer.byteLength(waarde, "utf8") > 72) {
    throw ongeldig("Een wachtwoord mag maximaal 72 tekens lang zijn.");
  }
  if (!/[a-zA-Z]/.test(waarde) || !/[0-9]/.test(waarde)) {
    throw ongeldig("Een wachtwoord moet minstens één letter en één cijfer bevatten.");
  }

  return waarde;
}

/** Uitnodigingscode: hoofdletters en cijfers, streepje mag. */
export function uitnodigingscode(waarde) {
  const schoon = tekst(waarde, "Uitnodigingscode", { max: 40 }).toUpperCase();

  if (!/^[A-Z0-9-]+$/.test(schoon)) {
    throw ongeldig("Een uitnodigingscode bestaat uit letters, cijfers en streepjes.");
  }

  return schoon;
}
