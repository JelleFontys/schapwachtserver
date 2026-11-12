const MAX_POGINGEN = 5;
const SLOT_MS = 15 * 60 * 1000;

const tellers = new Map();

const sleutelVan = (email, ip) => `${email}|${ip}`;

export function wachttijd(email, ip) {
  const teller = tellers.get(sleutelVan(email, ip));
  if (!teller) return 0;

  const over = teller.tot - Date.now();
  if (over <= 0) {
    tellers.delete(sleutelVan(email, ip));
    return 0;
  }

  return teller.aantal >= MAX_POGINGEN ? Math.ceil(over / 1000) : 0;
}

export function pogingMislukt(email, ip) {
  const sleutel = sleutelVan(email, ip);
  const teller = tellers.get(sleutel) ?? { aantal: 0, tot: 0 };

  teller.aantal += 1;
  teller.tot = Date.now() + SLOT_MS;
  tellers.set(sleutel, teller);
}

export function pogingGelukt(email, ip) {
  tellers.delete(sleutelVan(email, ip));
}

export function vergeetAlles() {
  tellers.clear();
}
