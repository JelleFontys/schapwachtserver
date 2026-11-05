// Rekenwerk aan het raster van een plattegrond.
//
// Hier staat niets in dat met de database praat. Daardoor is het te
// testen zonder MySQL, en dat is ook de reden dat het een apart
// bestand is.

/**
 * Rijen hebben een letter (A tot en met Z), kolommen een nummer. Zo
 * heet het vak linksboven "A1", net als in een spreadsheet, en dat is
 * iets wat iedereen in de winkel zonder uitleg begrijpt. Meer dan 26
 * rijen zou "AA" opleveren, en een parkshop heeft geen 27 stellingen.
 */
export const MAX_RIJEN = 26;
export const MAX_KOLOMMEN = 30;

export function rijLetter(rij) {
  return String.fromCharCode(64 + rij);
}

/** "A1", "C4": de plek van een vak, los van de naam die het heeft. */
export function positie(rij, kolom) {
  return `${rijLetter(rij)}${kolom}`;
}

/** Valt dit vak weg als het raster zo groot wordt? */
export function valtBuiten(vak, rijen, kolommen) {
  return vak.rij > rijen || vak.kolom > kolommen;
}

/**
 * Welke plekken hebben nog geen vak? Bij een nieuw raster zijn dat
 * ze allemaal, bij vergroten alleen de nieuwe rand.
 */
export function ontbrekendePosities(bestaande, rijen, kolommen) {
  const bezet = new Set(bestaande.map((vak) => `${vak.rij}:${vak.kolom}`));
  const ontbrekend = [];

  for (let rij = 1; rij <= rijen; rij++) {
    for (let kolom = 1; kolom <= kolommen; kolom++) {
      if (!bezet.has(`${rij}:${kolom}`)) ontbrekend.push({ rij, kolom });
    }
  }

  return ontbrekend;
}
