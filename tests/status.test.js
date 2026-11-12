import { describe, it, expect } from "vitest";

import {
  STANDAARD_AFPRIJS_DAGEN,
  afprijsDagenVan,
  dagenTussen,
  ernstigste,
  statusVan,
  vandaag,
  verschuif,
} from "../kern/status.js";

const VANDAAG = "2026-11-11";
const over = (dagen) => verschuif(VANDAAG, dagen);

describe("statusVan, afprijsregel 2 dagen", () => {
  const status = (dagen) => statusVan(over(dagen), 2, VANDAAG);

  it("is groen bij 3 dagen of meer", () => {
    expect(status(3)).toBe("RUIM");
    expect(status(40)).toBe("RUIM");
  });

  it("wordt oranje op precies 2 dagen voor de datum", () => {
    expect(status(2)).toBe("AFPRIJZEN");
  });

  it("is oranje op de dag zelf: tot en met die dag mag het verkocht worden", () => {
    expect(status(0)).toBe("AFPRIJZEN");
  });

  it("wordt rood de dag na de datum", () => {
    expect(status(-1)).toBe("OVER");
  });

  it("blijft rood, ook ver over de datum (er wordt nooit iets vanzelf afgemeld)", () => {
    expect(status(-60)).toBe("OVER");
  });
});

describe("statusVan, andere afprijsregels", () => {
  it("met 0 dagen is alleen de dag zelf oranje", () => {
    expect(statusVan(over(1), 0, VANDAAG)).toBe("RUIM");
    expect(statusVan(over(0), 0, VANDAAG)).toBe("AFPRIJZEN");
  });

  it("met 14 dagen wordt het twee weken van tevoren oranje", () => {
    expect(statusVan(over(15), 14, VANDAAG)).toBe("RUIM");
    expect(statusVan(over(14), 14, VANDAAG)).toBe("AFPRIJZEN");
  });
});

describe("afprijsDagenVan", () => {
  it("neemt de regel van de productgroep", () => {
    expect(afprijsDagenVan({ Productgroep: { afprijsDagen: 14 } })).toBe(14);
  });

  it("neemt 0 als 0, niet als 'niets ingesteld'", () => {
    expect(afprijsDagenVan({ Productgroep: { afprijsDagen: 0 } })).toBe(0);
  });

  it("valt zonder productgroep terug op de standaardwaarde", () => {
    expect(afprijsDagenVan({ Productgroep: null })).toBe(STANDAARD_AFPRIJS_DAGEN);
  });
});

describe("ernstigste: de status van een vak", () => {
  it("is leeg als er niets ligt", () => {
    expect(ernstigste([])).toBeNull();
  });

  it("volgt de ernstigste partij", () => {
    expect(ernstigste(["RUIM", "OVER", "AFPRIJZEN"])).toBe("OVER");
    expect(ernstigste(["RUIM", "AFPRIJZEN"])).toBe("AFPRIJZEN");
  });

  it("slaat lege vakken over bij een hele kant", () => {
    expect(ernstigste([null, "RUIM", null])).toBe("RUIM");
  });
});

describe("rekenen met datums", () => {
  it("telt dagen over een maandgrens", () => {
    expect(dagenTussen("2026-10-30", "2026-11-02")).toBe(3);
  });

  it("telt goed over de overgang naar wintertijd", () => {
    expect(dagenTussen("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("telt goed over een schrikkeldag", () => {
    expect(verschuif("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("vandaag is de Nederlandse datum, niet die van de server", () => {
    expect(vandaag(new Date("2026-11-11T23:30:00Z"))).toBe("2026-11-12");
  });

  it("ook in de zomer, als het verschil twee uur is", () => {
    expect(vandaag(new Date("2026-07-01T22:30:00Z"))).toBe("2026-07-02");
    expect(vandaag(new Date("2026-07-01T21:30:00Z"))).toBe("2026-07-01");
  });
});
