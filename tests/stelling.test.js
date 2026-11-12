import { describe, it, expect } from "vitest";

import {
  dikte,
  kantLabels,
  controleerKanten,
  verschilRijen,
  plekNaam,
} from "../kern/stelling.js";

const vlak = (breedte, hoogte) => ({ x: 1, y: 1, breedte, hoogte });
const staand2 = vlak(2, 8);
const staand1 = vlak(1, 8);
const liggend2 = vlak(8, 2);
const kant = (naam, rijen) => ({ naam, rijen });

describe("dikte", () => {
  it("is de korte kant van de rechthoek", () => {
    expect(dikte(vlak(2, 8))).toBe(2);
    expect(dikte(vlak(8, 1))).toBe(1);
    expect(dikte(vlak(3, 3))).toBe(3);
  });
});

describe("kantLabels", () => {
  it("noemt de kanten van een staande stelling van 2 dik links en rechts", () => {
    expect(kantLabels(staand2)).toEqual({ LINKS: "linkerkant", RECHTS: "rechterkant" });
  });

  it("noemt de kanten van een liggende stelling van 2 dik boven en onder", () => {
    expect(kantLabels(liggend2)).toEqual({ LINKS: "bovenkant", RECHTS: "onderkant" });
  });

  it("heeft bij 1 dik maar één kant, en die heet gewoon de stelling", () => {
    expect(kantLabels(staand1)).toEqual({ LINKS: "stelling", RECHTS: null });
    expect(kantLabels(vlak(8, 1))).toEqual({ LINKS: "stelling", RECHTS: null });
  });
});

describe("controleerKanten bij 2 dik", () => {
  it("neemt twee kanten met namen en rijen aan", () => {
    const kanten = controleerKanten(
      { links: kant(" Koek en snoep ", [6, 6, 4]), rechts: kant("Chips", [5]) },
      staand2,
    );
    expect(kanten).toEqual({
      LINKS: { naam: "Koek en snoep", rijen: [6, 6, 4] },
      RECHTS: { naam: "Chips", rijen: [5] },
    });
  });

  it("wil allebei de kanten", () => {
    expect(() => controleerKanten({ links: kant("Koek", [4]) }, staand2)).toThrow(/rechterkant ontbreekt/);
  });

  it("wil op elke kant minstens één rij", () => {
    expect(() =>
      controleerKanten({ links: kant("Koek", [4]), rechts: kant("Chips", []) }, staand2),
    ).toThrow(/rechterkant heeft minstens één rij/);
  });

  it("wil een naam voor elke kant", () => {
    expect(() =>
      controleerKanten({ links: kant(" ", [4]), rechts: kant("Chips", [4]) }, staand2),
    ).toThrow(/Naam van de linkerkant/);
  });

  it("gebruikt in de melding de kantnaam die bij de stand past", () => {
    expect(() =>
      controleerKanten({ links: kant("", [4]), rechts: kant("x", [4]) }, liggend2),
    ).toThrow(/bovenkant/);
  });

  it("weigert een rij zonder producten", () => {
    expect(() =>
      controleerKanten({ links: kant("x", [4, 0]), rechts: kant("y", [1]) }, staand2),
    ).toThrow(/Rij 2 van de linkerkant/);
  });

  it("weigert meer dan 12 rijen", () => {
    expect(() =>
      controleerKanten({ links: kant("x", Array(13).fill(1)), rechts: kant("y", [1]) }, staand2),
    ).toThrow(/12 rijen/);
  });
});

describe("controleerKanten bij 1 dik", () => {
  it("neemt één kant aan", () => {
    expect(controleerKanten({ links: kant("Dranken", [8, 8]), rechts: null }, staand1)).toEqual({
      LINKS: { naam: "Dranken", rijen: [8, 8] },
      RECHTS: null,
    });
  });

  it("weigert een tweede kant", () => {
    expect(() =>
      controleerKanten({ links: kant("Dranken", [8]), rechts: kant("Chips", [4]) }, staand1),
    ).toThrow(/maar één kant/);
  });

  it("noemt de kant in een melding gewoon 'de stelling'", () => {
    expect(() => controleerKanten({ links: kant("", [8]) }, staand1)).toThrow(/Naam van de stelling/);
  });
});

describe("controleerKanten bij 3 dik of meer", () => {
  it("weigert, ook als de kanten verder kloppen", () => {
    expect(() =>
      controleerKanten({ links: kant("a", [1]), rechts: kant("b", [1]) }, vlak(3, 8)),
    ).toThrow(/maximaal 2 hokjes dik/);
  });

  it("kijkt naar de korte kant: 3 breed en 1 hoog is gewoon 1 dik", () => {
    expect(() => controleerKanten({ links: kant("a", [1]) }, vlak(3, 1))).not.toThrow();
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
