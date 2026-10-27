// Mislukte inlogpogingen tellen.
//
// Zonder rem kan iemand duizenden wachtwoorden per minuut proberen. Na
// vijf mislukte pogingen op hetzelfde e-mailadres vanaf hetzelfde
// IP-adres gaat de deur een kwartier op slot.
//
// Dit zit in het geheugen van de server. Dat is eerlijk gezegd niet
// waterdicht: na een herstart is de teller leeg, en bij meerdere
// instanties heeft elke instantie zijn eigen teller. Voor dit project
// draait er één instantie, dus het werkt. Zou de app groeien, dan hoort
// deze teller in de database of in Redis.

const MAX_POGINGEN = 5;
const SLOT_MS = 15 * 60 * 1000;

const tellers = new Map();

const sleutelVan = (email, ip) => `${email}|${ip}`;

/** Hoe lang zit dit adres nog op slot? 0 als het open is. */
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

/** Alleen voor tests: alle tellers leegmaken. */
export function vergeetAlles() {
  tellers.clear();
}
