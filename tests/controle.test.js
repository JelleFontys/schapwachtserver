import { describe, it, expect } from "vitest";

import * as controle from "../kern/controle.js";

describe("controle.email", () => {
  it("maakt er kleine letters van en haalt spaties weg", () => {
    expect(controle.email("  Jelle@Voorbeeld.NL ")).toBe("jelle@voorbeeld.nl");
  });

  it.each(["geenapenstaartje", "twee@@keer.nl", "zonder@punt", "@voorbeeld.nl", ""])(
    "weigert %j",
    (waarde) => {
      expect(() => controle.email(waarde)).toThrow();
    },
  );

  it("geeft een fout met status 400", () => {
    expect(() => controle.email("fout")).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });
});

describe("controle.wachtwoord", () => {
  it("laat een wachtwoord met letters en cijfers door", () => {
    expect(controle.wachtwoord("Demo1234!")).toBe("Demo1234!");
  });

  it("knipt geen spaties weg, want die horen bij het wachtwoord", () => {
    expect(controle.wachtwoord(" spatie 1 ")).toBe(" spatie 1 ");
  });

  it("weigert korter dan 8 tekens", () => {
    expect(() => controle.wachtwoord("kort1")).toThrow(/8 tekens/);
  });

  it("weigert een wachtwoord zonder cijfer", () => {
    expect(() => controle.wachtwoord("alleenletters")).toThrow(/cijfer/);
  });

  // bcrypt kijkt alleen naar de eerste 72 bytes. Zonder deze grens zou
  // alles daarna stil wegvallen.
  it("weigert meer dan 72 bytes", () => {
    expect(() => controle.wachtwoord("a1" + "x".repeat(71))).toThrow(/72 tekens/);
  });
});

describe("controle.uitnodigingscode", () => {
  it("maakt er hoofdletters van", () => {
    expect(controle.uitnodigingscode("demo-2026")).toBe("DEMO-2026");
  });

  it("weigert vreemde tekens", () => {
    expect(() => controle.uitnodigingscode("code;DROP")).toThrow();
  });
});

describe("controle.geheelGetal", () => {
  const grenzen = { min: 1, max: 26 };

  it("laat een getal binnen de grenzen door", () => {
    expect(controle.geheelGetal(4, "Rijen", grenzen)).toBe(4);
  });

  it("neemt een getal als tekst aan, zoals een formulier het soms stuurt", () => {
    expect(controle.geheelGetal("4", "Rijen", grenzen)).toBe(4);
  });

  it.each([0, 27, -1])("weigert %j omdat het buiten de grenzen valt", (waarde) => {
    expect(() => controle.geheelGetal(waarde, "Rijen", grenzen)).toThrow(/tussen 1 en 26/);
  });

  it.each([2.5, "vier", "", null, undefined, NaN])("weigert %j", (waarde) => {
    expect(() => controle.geheelGetal(waarde, "Rijen", grenzen)).toThrow();
  });
});

describe("controle.optioneleTekst", () => {
  it("haalt spaties weg", () => {
    expect(controle.optioneleTekst("  Stelling B ", "Naam")).toBe("Stelling B");
  });

  it.each(["", "   ", null, undefined])("maakt van %j een lege naam", (waarde) => {
    expect(controle.optioneleTekst(waarde, "Naam")).toBeNull();
  });

  it("weigert te lange tekst", () => {
    expect(() => controle.optioneleTekst("x".repeat(121), "Naam", { max: 120 })).toThrow();
  });
});

describe("controle.datum", () => {
  it("neemt een echte datum aan", () => {
    expect(controle.datum("2026-11-11", "Datum")).toBe("2026-11-11");
  });

  // Past in het patroon, maar bestaat niet.
  it.each(["2026-02-30", "2026-13-01", "2027-02-29"])("weigert %s", (waarde) => {
    expect(() => controle.datum(waarde, "Datum")).toThrow(/bestaat niet/);
  });

  it.each(["11-11-2026", "2026/11/11", "", null])("weigert %j als vorm", (waarde) => {
    expect(() => controle.datum(waarde, "Datum")).toThrow(/jjjj-mm-dd/);
  });
});

describe("controle.barcode", () => {
  it("haalt spaties weg die iemand bij het overtypen zet", () => {
    expect(controle.barcode("8710 4001 4530 1")).toBe("8710400145301");
  });

  it("maakt van leeg geen barcode", () => {
    expect(controle.barcode("")).toBeNull();
    expect(controle.barcode(undefined)).toBeNull();
  });

  it.each(["1234567", "123456789012345", "87104OO145301"])("weigert %s", (waarde) => {
    expect(() => controle.barcode(waarde)).toThrow(/8 tot 14 cijfers/);
  });
});

describe("controle.keuze", () => {
  it("weigert iets buiten de lijst", () => {
    expect(() => controle.keuze("KWIJT", "Uitkomst", ["GESTICKERD", "WEGGEGOOID"])).toThrow();
  });
});
