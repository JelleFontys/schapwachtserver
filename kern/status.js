// Groen, oranje of rood: de status van een partij.
//
// Dit is het hart van de app, en daarom staat het los van de database:
// het is pure rekenkunde met datums, en zo is het tot op de dag nauwkeurig
// te testen.
//
// De regel, met `dagen` = hoeveel dagen het nog houdbaar is:
//
//   dagen < 0                  → OVER       rood    de datum is voorbij
//   0 ≤ dagen ≤ afprijsDagen   → AFPRIJZEN  oranje  binnen de afprijsregel
//   dagen > afprijsDagen       → RUIM       groen   niets te doen
//
// Op de houdbaarheidsdatum zelf (dagen = 0) is een product dus oranje en
// niet rood: tot en met die dag mag het nog verkocht worden.

export const STATUSSEN = ["RUIM", "AFPRIJZEN", "OVER"];

/** Als een product geen productgroep heeft (SW-30: "standaardwaarde"). */
export const STANDAARD_AFPRIJS_DAGEN = 2;

/**
 * "Vandaag" is vandaag in Nederland, niet op de server. De server draait
 * in UTC; zonder dit zou tussen middernacht en 1 uur (in de zomer 2 uur)
 * de app nog de datum van gisteren gebruiken.
 */
export const TIJDZONE = "Europe/Amsterdam";

const datumNotatie = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIJDZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** De datum van vandaag in Nederland, als "jjjj-mm-dd". */
export function vandaag(nu = new Date()) {
  return datumNotatie.format(nu);
}

/** De Nederlandse datum van een tijdstip, als "jjjj-mm-dd". */
export function datumVan(tijdstip) {
  return datumNotatie.format(new Date(tijdstip));
}

/**
 * Aantal dagen van `van` tot `tot`, allebei "jjjj-mm-dd". Gerekend in
 * UTC, zodat een overgang naar zomer- of wintertijd geen dag van 23 of 25
 * uur oplevert.
 */
export function dagenTussen(van, tot) {
  const [vj, vm, vd] = van.split("-").map(Number);
  const [tj, tm, td] = tot.split("-").map(Number);
  return Math.round((Date.UTC(tj, tm - 1, td) - Date.UTC(vj, vm - 1, vd)) / 86_400_000);
}

/** Een datum verschoven met een aantal dagen, als "jjjj-mm-dd". */
export function verschuif(datum, dagen) {
  const [j, m, d] = datum.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, d + dagen)).toISOString().slice(0, 10);
}

export function statusVan(houdbaarTot, afprijsDagen, opDatum = vandaag()) {
  const dagen = dagenTussen(opDatum, houdbaarTot);
  if (dagen < 0) return "OVER";
  if (dagen <= afprijsDagen) return "AFPRIJZEN";
  return "RUIM";
}

/** De afprijsregel die voor een product geldt. */
export function afprijsDagenVan(product) {
  return product?.Productgroep?.afprijsDagen ?? STANDAARD_AFPRIJS_DAGEN;
}

/**
 * De status van een vak, een kant of een stelling: de ernstigste van wat
 * erin ligt. Leeg geeft null.
 *
 * SW-31 zegt "het vak volgt de vroegste datum", en meestal is dat
 * hetzelfde. Het verschil zit in een vak met producten uit verschillende
 * productgroepen: dan kan een partij met een latere datum al oranje zijn
 * terwijl de vroegste nog groen is. Hier wint dan de ernstigste. Een vals
 * alarm kost een blik op het schap; een gemist alarm kost een product
 * dat over de datum in het schap ligt. Dat is dezelfde afweging als in
 * het hele ontwerp.
 */
export function ernstigste(statussen) {
  let uit = null;
  for (const status of statussen) {
    if (status && (uit === null || STATUSSEN.indexOf(status) > STATUSSEN.indexOf(uit))) {
      uit = status;
    }
  }
  return uit;
}
