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
