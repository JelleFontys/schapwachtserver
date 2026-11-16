import { describe, expect, it } from "vitest";

import { beoordeel } from "../kern/aandacht.js";

describe("beoordeel", () => {
  it("te weinig gegevens: niets", () => {
    expect(beoordeel({ weggegooid: 2 })).toBeNull();
    expect(beoordeel({ weggegooid: 1, uitverkocht: 0, gestickerd: 1 })).toBeNull();
  });

  it("minder dan de helft weggegooid: niets", () => {
    expect(beoordeel({ weggegooid: 2, uitverkocht: 3 })).toBeNull();
  });

  it("precies de helft telt mee", () => {
    expect(beoordeel({ weggegooid: 2, uitverkocht: 2 })).toEqual({ aandeel: 0.5, advies: "EERDER_AFPRIJZEN" });
  });

  it("nooit verkocht: minder bestellen of uit het assortiment", () => {
    expect(beoordeel({ weggegooid: 3 })).toEqual({ aandeel: 1, advies: "NIET_VERKOCHT" });
  });

  it("wel gestickerd en toch vaak weggegooid: afprijzen helpt niet genoeg", () => {
    expect(beoordeel({ weggegooid: 4, gestickerd: 1, uitverkocht: 1 })).toEqual({
      aandeel: 0.67,
      advies: "AFPRIJZEN_HELPT_NIET",
    });
  });

  it("soms uitverkocht, nooit gestickerd: eerder afprijzen", () => {
    expect(beoordeel({ weggegooid: 3, uitverkocht: 1 })).toEqual({ aandeel: 0.75, advies: "EERDER_AFPRIJZEN" });
  });
});
