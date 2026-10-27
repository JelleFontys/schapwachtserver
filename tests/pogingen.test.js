import { describe, it, expect, beforeEach } from "vitest";

import { wachttijd, pogingMislukt, pogingGelukt, vergeetAlles } from "../kern/pogingen.js";

const EMAIL = "tim@voorbeeld.nl";
const IP = "10.0.0.1";

beforeEach(() => vergeetAlles());

describe("inlogpogingen tellen", () => {
  it("laat de eerste poging gewoon door", () => {
    expect(wachttijd(EMAIL, IP)).toBe(0);
  });

  it("zet pas na vijf mislukte pogingen op slot", () => {
    for (let i = 0; i < 4; i++) pogingMislukt(EMAIL, IP);
    expect(wachttijd(EMAIL, IP)).toBe(0);

    pogingMislukt(EMAIL, IP);
    expect(wachttijd(EMAIL, IP)).toBeGreaterThan(0);
  });

  it("zet de teller terug na een geslaagde poging", () => {
    for (let i = 0; i < 5; i++) pogingMislukt(EMAIL, IP);
    pogingGelukt(EMAIL, IP);

    expect(wachttijd(EMAIL, IP)).toBe(0);
  });

  // Anders kan iemand één account onbruikbaar maken door vijf keer een
  // fout wachtwoord in te typen.
  it("sluit een ander IP-adres niet buiten", () => {
    for (let i = 0; i < 5; i++) pogingMislukt(EMAIL, IP);

    expect(wachttijd(EMAIL, "10.0.0.2")).toBe(0);
  });

  it("sluit een ander account op hetzelfde IP-adres niet buiten", () => {
    for (let i = 0; i < 5; i++) pogingMislukt(EMAIL, IP);

    expect(wachttijd("sanne@voorbeeld.nl", IP)).toBe(0);
  });
});
