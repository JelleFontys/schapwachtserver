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

export function overlappen(a, b) {
  return (
    a.x < b.x + b.breedte &&
    b.x < a.x + a.breedte &&
    a.y < b.y + b.hoogte &&
    b.y < a.y + a.hoogte
  );
}

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

export function randWijziging(rand, actie) {
  const stap = actie === "erbij" ? 1 : -1;

  return {
    rijen: rand === "boven" || rand === "onder" ? stap : 0,
    kolommen: rand === "links" || rand === "rechts" ? stap : 0,
    schuifX: rand === "links" ? stap : 0,
    schuifY: rand === "boven" ? stap : 0,
  };
}
