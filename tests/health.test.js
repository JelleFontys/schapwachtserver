import { describe, it, expect } from "vitest";
import request from "supertest";

import { maakApp } from "../kern/app.js";

describe("GET /api/health", () => {
  it("geeft 200 en status ok", async () => {
    const response = await request(maakApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("vertelt of de database bereikbaar is", async () => {
    const response = await request(maakApp()).get("/api/health");

    expect(["ok", "onbereikbaar"]).toContain(response.body.database);
  });
});

describe("onbekende route", () => {
  it("geeft 404 met een foutmelding", async () => {
    const response = await request(maakApp()).get("/api/bestaat-niet");

    expect(response.status).toBe(404);
    expect(response.body.fout).toContain("Geen route gevonden");
  });
});
