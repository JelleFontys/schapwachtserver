// Tests voor de auth-routes.
//
// Deze tests raken de database niet: ze controleren de weigeringen, en
// die komen allemaal vóór de eerste query. Dat is bewust, want zo
// draaien ze ook in de pipeline, waar geen MySQL staat. Het slagen van
// registreren en inloggen is daarmee nog niet getest; dat heeft een
// echte database nodig.

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

import { maakApp } from "../kern/app.js";
import { JWT_SECRET } from "../kern/config.js";

const app = maakApp();

describe("POST /api/auth/registreer", () => {
  it("weigert een lege body", async () => {
    const r = await request(app).post("/api/auth/registreer").send({});

    expect(r.status).toBe(400);
    expect(r.body.fout).toBeTruthy();
  });

  it("weigert een te kort wachtwoord", async () => {
    const r = await request(app).post("/api/auth/registreer").send({
      naam: "Tim de Groot",
      email: "tim@voorbeeld.nl",
      wachtwoord: "kort1",
      winkelnaam: "Parkshop",
    });

    expect(r.status).toBe(400);
    expect(r.body.fout).toMatch(/8 tekens/);
  });

  // Een gebruiker hoort altijd bij een winkel: óf je begint een nieuwe,
  // óf je sluit je aan met een code. Beide of geen van beide kan niet.
  it("weigert registreren zonder winkelnaam en zonder code", async () => {
    const r = await request(app).post("/api/auth/registreer").send({
      naam: "Tim de Groot",
      email: "tim@voorbeeld.nl",
      wachtwoord: "Demo1234!",
    });

    expect(r.status).toBe(400);
    expect(r.body.fout).toMatch(/Kies één van beide/);
  });

  it("weigert registreren met winkelnaam én code", async () => {
    const r = await request(app).post("/api/auth/registreer").send({
      naam: "Tim de Groot",
      email: "tim@voorbeeld.nl",
      wachtwoord: "Demo1234!",
      winkelnaam: "Parkshop",
      uitnodigingscode: "DEMO-2026",
    });

    expect(r.status).toBe(400);
  });
});

describe("POST /api/auth/inloggen", () => {
  it("weigert een ongeldig e-mailadres", async () => {
    const r = await request(app)
      .post("/api/auth/inloggen")
      .send({ email: "geen-adres", wachtwoord: "Demo1234!" });

    expect(r.status).toBe(400);
  });
});

describe("POST /api/auth/uitloggen", () => {
  it("lukt altijd, want het token gooit de client zelf weg", async () => {
    const r = await request(app).post("/api/auth/uitloggen");

    expect(r.status).toBe(200);
  });
});

describe("beveiligde routes", () => {
  it.each(["/api/auth/ik", "/api/winkel", "/api/winkel/medewerkers"])(
    "geeft 401 op %s zonder token",
    async (pad) => {
      const r = await request(app).get(pad);

      expect(r.status).toBe(401);
    },
  );

  it("geeft 401 bij een token zonder Bearer ervoor", async () => {
    const r = await request(app).get("/api/auth/ik").set("Authorization", "losse-tekst");

    expect(r.status).toBe(401);
  });

  it("geeft 401 bij een token met een andere sleutel", async () => {
    const vals = jwt.sign({ winkelId: "x", rol: "LEIDINGGEVENDE" }, "andere-sleutel", {
      subject: "11111111-1111-4111-8111-111111111111",
    });
    const r = await request(app).get("/api/auth/ik").set("Authorization", `Bearer ${vals}`);

    expect(r.status).toBe(401);
  });

  // Een geldig ondertekend token van een account dat niet bestaat moet
  // ook 401 geven. Dit is de enige test hier die de database aanraakt;
  // is die onbereikbaar, dan komt er 500 uit en dat is geen fout in de
  // code. Daarom staat die uitkomst hier toegestaan.
  it("vertrouwt niet alleen op de ondertekening van het token", async () => {
    // De foutafhandeling schrijft een onbereikbare database naar de
    // console. Dat is terecht, maar in de testuitvoer is het ruis.
    const stil = vi.spyOn(console, "error").mockImplementation(() => {});

    const geldigOndertekend = jwt.sign(
      { winkelId: "22222222-2222-4222-8222-222222222222", rol: "LEIDINGGEVENDE" },
      JWT_SECRET,
      { subject: "11111111-1111-4111-8111-111111111111" },
    );
    const r = await request(app)
      .get("/api/auth/ik")
      .set("Authorization", `Bearer ${geldigOndertekend}`);

    expect([401, 500]).toContain(r.status);
    stil.mockRestore();
  });
});
