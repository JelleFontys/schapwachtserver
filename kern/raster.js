// Rekenwerk aan de vloer van een plattegrond.
//
// Hier staat niets in dat met de database praat. Daardoor is het te
// testen zonder MySQL, en dat is ook de reden dat het een apart
// bestand is.
//
// Een rechthoek op de vloer is { x, y, breedte, hoogte }, met x en y
// de linkerbovenhoek, geteld vanaf 1.

/** Zo groot is een nieuwe plattegrond: 10 hokjes breed, 20 hoog. */
export const STANDAARD = { kolommen: 10, rijen: 20 };
export const MAX_RIJEN = 50;
export const MAX_KOLOMMEN = 50;

export const RANDEN = ["boven", "onder", "links", "rechts"];
export const ACTIES = ["erbij", "eraf"];

export function binnenRaster(vlak, rijen, kolommen) {
  return (
    vlak.x >= 1 &&
    vlak.y >= 1 &&
    vlak.breedte >= 1 &&
    vlak.hoogte >= 1 &&
    vlak.x + vlak.breedte - 1 <= kolommen &&
    vlak.y + vlak.hoogte - 1 <= rijen
  );
}

/** Liggen twee rechthoeken (deels) over elkaar? Naast elkaar mag. */
export function overlappen(a, b) {
  return (
    a.x < b.x + b.breedte &&
    b.x < a.x + a.breedte &&
    a.y < b.y + b.hoogte &&
    b.y < a.y + a.hoogte
  );
}

/** Staat deze rechthoek tegen de gegeven rand van de vloer? */
export function raaktRand(vlak, rand, rijen, kolommen) {
  switch (rand) {
    case "boven":
      return vlak.y === 1;
    case "onder":
      return vlak.y + vlak.hoogte - 1 === rijen;
    case "links":
      return vlak.x === 1;
    case "rechts":
      return vlak.x + vlak.breedte - 1 === kolommen;
    default:
      return false;
  }
}

/**
 * Wat er verandert als er aan een rand een rij of kolom bij komt of af
 * gaat.
 *
 * Erbij aan de onder- of rechterkant is simpel: het raster wordt
 * groter en verder verandert er niets. Erbij aan de boven- of
 * linkerkant schuift alles één plek op, want de nieuwe rij wordt rij 1.
 * Zonder dat zou een stelling ineens een hokje verder van de muur
 * staan dan in het echt.
 */
export function randWijziging(rand, actie) {
  const stap = actie === "erbij" ? 1 : -1;

  return {
    rijen: rand === "boven" || rand === "onder" ? stap : 0,
    kolommen: rand === "links" || rand === "rechts" ? stap : 0,
    schuifX: rand === "links" ? stap : 0,
    schuifY: rand === "boven" ? stap : 0,
  };
}
