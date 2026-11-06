import { describe, it, expect } from "vitest";

import { kantLabels, controleerKanten, verschilRijen, plekNaam } from "../kern/stelling.js";

const staand = kantLabels(2, 8);

describe("kantLabels", () => {
  it("noemt de kanten van een staande stelling links en rechts", () => {
    expect(staand).toEqual({ LINKS: "linkerkant", RECHTS: "rechterkant" });
  });

  it("noemt de kanten van een liggende stelling boven en onder", () => {
    expect(kantLabels(8, 1)).toEqual({ LINKS: "bovenkant", RECHTS: "onderkant" });
  });
});

describe("controleerKanten", () => {
  it("neemt twee kanten met namen en rijen aan", () => {
    const kanten = controleerKanten(
      { links: { naam: " Koek en snoep ", rijen: [6, 6, 4] }, rechts: { naam: "Chips", rijen: [5] } },
      staand,
    );
    expect(kanten).toEqual({
      LINKS: { naam: "Koek en snoep", rijen: [6, 6, 4] },
      RECHTS: { naam: "Chips", rijen: [5] },
    });
  });

  it("maakt van een kant zonder rijen geen kant (stelling tegen de muur)", () => {
    const kanten = controleerKanten({ links: { naam: "Dranken", rijen: [8] }, rechts: { naam: "", rijen: [] } }, staand);
    expect(kanten.RECHTS).toBeNull();
  });

  it("weigert een stelling zonder enige rij", () => {
    expect(() => controleerKanten({ links: { naam: "x", rijen: [] } }, staand)).toThrow(/minstens één kant/);
  });

  it("wil een naam voor een kant met rijen", () => {
    expect(() => controleerKanten({ links: { naam: " ", rijen: [4] } }, staand)).toThrow(/Naam van de linkerkant/);
  });

  it("gebruikt in de melding de kantnaam die bij de stand past", () => {
    expect(() => controleerKanten({ links: { naam: "", rijen: [4] } }, kantLabels(8, 1))).toThrow(/bovenkant/);
  });

  it("weigert een rij zonder producten", () => {
    expect(() => controleerKanten({ links: { naam: "x", rijen: [4, 0] } }, staand)).toThrow(/Rij 2 van de linkerkant/);
  });

  it("weigert meer dan 12 rijen", () => {
    expect(() => controleerKanten({ links: { naam: "x", rijen: Array(13).fill(1) } }, staand)).toThrow(/12 rijen/);
  });
});

describe("verschilRijen", () => {
  it("ziet niets als er niets verandert", () => {
    expect(verschilRijen([6, 6], [6, 6])).toEqual({
      rijenWeg: [],
      rijenErbij: [],
      vakkenWeg: [],
      vakkenErbij: [],
    });
  });

  it("haalt rijen weg aan de onderkant", () => {
    expect(verschilRijen([6, 6, 6], [6]).rijenWeg).toEqual([2, 3]);
  });

  it("zet nieuwe rijen eronder, met hun aantal vakken", () => {
    expect(verschilRijen([6], [6, 4]).rijenErbij).toEqual([{ nummer: 2, vakken: 4 }]);
  });

  // Vakken verdwijnen rechts. Wat links staat houdt zijn plek, en een
  // partij die daar ligt dus ook.
  it("haalt vakken weg aan de rechterkant van een rij", () => {
    expect(verschilRijen([6, 6], [6, 4]).vakkenWeg).toEqual([{ nummer: 2, vanaf: 5 }]);
  });

  it("zet nieuwe vakken rechts erbij", () => {
    expect(verschilRijen([4], [6]).vakkenErbij).toEqual([{ nummer: 1, van: 5, tot: 6 }]);
  });

  it("kan alles tegelijk", () => {
    expect(verschilRijen([6, 6, 6], [8, 3])).toEqual({
      rijenWeg: [3],
      rijenErbij: [],
      vakkenWeg: [{ nummer: 2, vanaf: 4 }],
      vakkenErbij: [{ nummer: 1, van: 7, tot: 8 }],
    });
  });
});

describe("plekNaam", () => {
  it("is leesbaar voor iemand in de winkel", () => {
    expect(plekNaam("Koek en snoep", 2, 5)).toBe("Koek en snoep, rij 2, vak 5");
  });
});
