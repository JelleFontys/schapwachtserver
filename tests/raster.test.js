import { describe, it, expect } from "vitest";

import {
  STANDAARD,
  binnenRaster,
  overlappen,
  raaktRand,
  randWijziging,
} from "../kern/raster.js";

const stelling = (x, y, breedte, hoogte) => ({ x, y, breedte, hoogte });

describe("standaardgrootte", () => {
  it("is 10 breed en 20 hoog", () => {
    expect(STANDAARD).toEqual({ kolommen: 10, rijen: 20 });
  });
});

describe("binnenRaster", () => {
  it("accepteert een stelling die precies tot de rand loopt", () => {
    expect(binnenRaster(stelling(9, 13, 2, 8), 20, 10)).toBe(true);
  });

  it("weigert een stelling die er rechts uitsteekt", () => {
    expect(binnenRaster(stelling(10, 1, 2, 1), 20, 10)).toBe(false);
  });

  it("weigert een stelling die er onder uitsteekt", () => {
    expect(binnenRaster(stelling(1, 15, 1, 7), 20, 10)).toBe(false);
  });

  it("weigert een plek voor de eerste kolom", () => {
    expect(binnenRaster(stelling(0, 1, 1, 1), 20, 10)).toBe(false);
  });
});

describe("overlappen", () => {
  it("ziet twee stellingen over elkaar", () => {
    expect(overlappen(stelling(2, 3, 2, 8), stelling(3, 5, 2, 2))).toBe(true);
  });

  // Twee stellingen rug aan rug of in elkaars verlengde mogen gewoon.
  it("laat stellingen die alleen tegen elkaar aan staan door", () => {
    expect(overlappen(stelling(2, 3, 2, 8), stelling(4, 3, 2, 8))).toBe(false);
    expect(overlappen(stelling(2, 3, 2, 8), stelling(2, 11, 2, 4))).toBe(false);
  });

  it("ziet een stelling die helemaal binnen een andere ligt", () => {
    expect(overlappen(stelling(1, 1, 5, 5), stelling(2, 2, 1, 1))).toBe(true);
  });
});

describe("raaktRand", () => {
  const s = stelling(1, 18, 8, 3); // tegen de linker- en onderrand van 10x20

  it("ziet welke randen de stelling raakt", () => {
    expect(raaktRand(s, "links", 20, 10)).toBe(true);
    expect(raaktRand(s, "onder", 20, 10)).toBe(true);
  });

  it("ziet welke randen hij niet raakt", () => {
    expect(raaktRand(s, "boven", 20, 10)).toBe(false);
    expect(raaktRand(s, "rechts", 20, 10)).toBe(false);
  });
});

describe("randWijziging", () => {
  it("onder erbij: één rij meer, niets schuift", () => {
    expect(randWijziging("onder", "erbij")).toEqual({ rijen: 1, kolommen: 0, schuifX: 0, schuifY: 0 });
  });

  // De nieuwe rij wordt rij 1, dus alles wat er al stond moet één omlaag.
  it("boven erbij: één rij meer en alles schuift één omlaag", () => {
    expect(randWijziging("boven", "erbij")).toEqual({ rijen: 1, kolommen: 0, schuifX: 0, schuifY: 1 });
  });

  it("links eraf: één kolom minder en alles schuift één naar links", () => {
    expect(randWijziging("links", "eraf")).toEqual({ rijen: 0, kolommen: -1, schuifX: -1, schuifY: 0 });
  });

  it("rechts eraf: één kolom minder, niets schuift", () => {
    expect(randWijziging("rechts", "eraf")).toEqual({ rijen: 0, kolommen: -1, schuifX: 0, schuifY: 0 });
  });
});
