// Producten opzoeken in Open Food Facts, de openbare productdatabase.
// https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/

import { OFF_URL, OFF_USER_AGENT } from "./config.js";

const VELDEN = "product_name,product_name_nl,brands,quantity";
const WACHTTIJD = 5000;
const BEWAARTIJD = 60 * 60 * 1000;
const MAX_ONTHOUDEN = 500;

// Onthouden wat we al hebben opgevraagd: scannen en daarna opslaan
// vraagt anders twee keer hetzelfde, en de limiet is 15 per minuut.
const onthouden = new Map();

export class NietBereikbaar extends Error {}

export function naamVan(product) {
  const naam = (product?.product_name_nl || product?.product_name || "").trim();
  if (!naam) return null;

  const merk = (product.brands || "").split(",")[0].trim();
  const hoeveel = (product.quantity || "").trim();

  let volledig = naam;
  if (merk && !naam.toLowerCase().startsWith(merk.toLowerCase())) volledig = `${merk} ${volledig}`;
  if (hoeveel && !naam.toLowerCase().includes(hoeveel.toLowerCase())) volledig = `${volledig} ${hoeveel}`;
  return volledig.replace(/\s+/g, " ").slice(0, 190);
}

// Geeft { naam } of null als de barcode onbekend is. Gooit
// NietBereikbaar als Open Food Facts niet antwoordt.
export async function opzoeken(barcode) {
  const bewaard = onthouden.get(barcode);
  if (bewaard && bewaard.tot > Date.now()) return bewaard.waarde;

  let antwoord;
  try {
    antwoord = await fetch(`${OFF_URL}/api/v2/product/${encodeURIComponent(barcode)}?fields=${VELDEN}`, {
      headers: { "User-Agent": OFF_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(WACHTTIJD),
    });
  } catch {
    throw new NietBereikbaar("Open Food Facts antwoordt niet.");
  }

  let waarde = null;
  if (antwoord.status !== 404) {
    if (!antwoord.ok) throw new NietBereikbaar(`Open Food Facts gaf ${antwoord.status}.`);
    const gegevens = await antwoord.json().catch(() => null);
    const naam = gegevens?.status === 1 ? naamVan(gegevens.product) : null;
    waarde = naam ? { naam } : null;
  }

  if (onthouden.size >= MAX_ONTHOUDEN) onthouden.delete(onthouden.keys().next().value);
  onthouden.set(barcode, { waarde, tot: Date.now() + BEWAARTIJD });
  return waarde;
}

export function vergeetAlles() {
  onthouden.clear();
}
