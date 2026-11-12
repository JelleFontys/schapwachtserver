import { ongeldig } from "./hulp.js";

export function tekst(waarde, naam, { max = 190, min = 1 } = {}) {
  if (typeof waarde !== "string") throw ongeldig(`${naam} ontbreekt.`);

  const schoon = waarde.trim();
  if (schoon.length < min) throw ongeldig(`${naam} mag niet leeg zijn.`);
  if (schoon.length > max) throw ongeldig(`${naam} mag maximaal ${max} tekens lang zijn.`);

  return schoon;
}

export function email(waarde) {
  const schoon = tekst(waarde, "E-mailadres", { max: 190 }).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(schoon)) {
    throw ongeldig("Dit is geen geldig e-mailadres.");
  }

  return schoon;
}

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

export function geheelGetal(waarde, naam, { min, max }) {
  const getal = typeof waarde === "string" && waarde.trim() !== "" ? Number(waarde) : waarde;

  if (typeof getal !== "number" || !Number.isInteger(getal)) {
    throw ongeldig(`${naam} moet een heel getal zijn.`);
  }
  if (getal < min || getal > max) {
    throw ongeldig(`${naam} moet tussen ${min} en ${max} liggen.`);
  }

  return getal;
}

export function optioneleTekst(waarde, naam, { max = 190 } = {}) {
  if (waarde === undefined || waarde === null) return null;
  if (typeof waarde !== "string") throw ongeldig(`${naam} moet tekst zijn.`);

  const schoon = waarde.trim();
  if (schoon === "") return null;
  if (schoon.length > max) throw ongeldig(`${naam} mag maximaal ${max} tekens lang zijn.`);

  return schoon;
}

export function datum(waarde, naam) {
  if (typeof waarde !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(waarde)) {
    throw ongeldig(`${naam} moet een datum zijn (jjjj-mm-dd).`);
  }
  const [j, m, d] = waarde.split("-").map(Number);
  const echt = new Date(Date.UTC(j, m - 1, d)).toISOString().slice(0, 10);
  if (echt !== waarde) throw ongeldig(`${naam} bestaat niet.`);
  return waarde;
}

export function keuze(waarde, naam, opties) {
  if (!opties.includes(waarde)) {
    throw ongeldig(`${naam} moet een van deze zijn: ${opties.join(", ")}.`);
  }
  return waarde;
}

export function barcode(waarde) {
  if (waarde === undefined || waarde === null) return null;
  if (typeof waarde !== "string") throw ongeldig("Barcode moet tekst zijn.");

  const schoon = waarde.replace(/\s+/g, "");
  if (schoon === "") return null;
  if (!/^\d{8,14}$/.test(schoon)) throw ongeldig("Een barcode bestaat uit 8 tot 14 cijfers.");
  return schoon;
}

export function uitnodigingscode(waarde) {
  const schoon = tekst(waarde, "Uitnodigingscode", { max: 40 }).toUpperCase();

  if (!/^[A-Z0-9-]+$/.test(schoon)) {
    throw ongeldig("Een uitnodigingscode bestaat uit letters, cijfers en streepjes.");
  }

  return schoon;
}
