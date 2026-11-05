import { describe, it, expect } from "vitest";

import {
  MAX_RIJEN,
  rijLetter,
  positie,
  valtBuiten,
  ontbrekendePosities,
} from "../kern/raster.js";

describe("positie van een vak", () => {
  it("noemt linksboven A1", () => {
    expect(positie(1, 1)).toBe("A1");
  });

  it("gebruikt een letter voor de rij en een nummer voor de kolom", () => {
    expect(positie(3, 12)).toBe("C12");
  });

  it("komt tot Z en niet verder", () => {
    expect(rijLetter(MAX_RIJEN)).toBe("Z");
  });
});

describe("valtBuiten", () => {
  it("houdt een vak binnen het raster", () => {
    expect(valtBuiten({ rij: 2, kolom: 3 }, 2, 3)).toBe(false);
  });

  it("laat een vak in een weggehaalde rij vallen", () => {
    expect(valtBuiten({ rij: 3, kolom: 1 }, 2, 6)).toBe(true);
  });

  it("laat een vak in een weggehaalde kolom vallen", () => {
    expect(valtBuiten({ rij: 1, kolom: 7 }, 4, 6)).toBe(true);
  });
});

describe("ontbrekendePosities", () => {
  it("geeft bij een nieuw raster elke plek", () => {
    expect(ontbrekendePosities([], 2, 3)).toHaveLength(6);
  });

  it("geeft de plekken rij voor rij, van links naar rechts", () => {
    expect(ontbrekendePosities([], 2, 2)).toEqual([
      { rij: 1, kolom: 1 },
      { rij: 1, kolom: 2 },
      { rij: 2, kolom: 1 },
      { rij: 2, kolom: 2 },
    ]);
  });

  // Bij vergroten blijven de bestaande vakken staan, met hun naam en
  // wat erin ligt. Alleen de nieuwe rand komt erbij.
  it("geeft bij vergroten alleen de nieuwe rand", () => {
    const bestaand = ontbrekendePosities([], 2, 2);
    const nieuw = ontbrekendePosities(bestaand, 3, 3);

    expect(nieuw).toEqual([
      { rij: 1, kolom: 3 },
      { rij: 2, kolom: 3 },
      { rij: 3, kolom: 1 },
      { rij: 3, kolom: 2 },
      { rij: 3, kolom: 3 },
    ]);
  });

  it("geeft niets als het raster even groot blijft", () => {
    const bestaand = ontbrekendePosities([], 4, 6);
    expect(ontbrekendePosities(bestaand, 4, 6)).toEqual([]);
  });
});
