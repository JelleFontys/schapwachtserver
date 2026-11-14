import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NietBereikbaar, naamVan, opzoeken, vergeetAlles } from "../kern/openFoodFacts.js";

const antwoord = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

describe("naamVan", () => {
  it("zet merk en hoeveelheid erbij", () => {
    expect(naamVan({ product_name: "Grana Padano geraspt", brands: "Milbona,Lidl", quantity: "40 g" })).toBe(
      "Milbona Grana Padano geraspt 40 g",
    );
  });

  it("gebruikt de Nederlandse naam als die er is", () => {
    expect(naamVan({ product_name: "Whole milk", product_name_nl: "Volle melk" })).toBe("Volle melk");
  });

  it("zet het merk er niet dubbel in", () => {
    expect(naamVan({ product_name: "Nutella 400 g", brands: "Nutella", quantity: "400 g" })).toBe("Nutella 400 g");
  });

  it("geeft null zonder naam", () => {
    expect(naamVan({ brands: "Ferrero" })).toBeNull();
    expect(naamVan(undefined)).toBeNull();
  });
});

describe("opzoeken", () => {
  let fetch;

  beforeEach(() => {
    vergeetAlles();
    fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("vindt een product en stuurt een eigen User-Agent mee", async () => {
    fetch.mockResolvedValue(antwoord(200, { status: 1, product: { product_name: "Pindakaas", quantity: "350 g" } }));

    expect(await opzoeken("8712345678906")).toEqual({ naam: "Pindakaas 350 g" });
    const [adres, opties] = fetch.mock.calls[0];
    expect(adres).toContain("/api/v2/product/8712345678906");
    expect(opties.headers["User-Agent"]).toMatch(/^SchapWacht\//);
  });

  it("geeft null bij een onbekende barcode", async () => {
    fetch.mockResolvedValue(antwoord(404, { status: 0 }));
    expect(await opzoeken("8712345678906")).toBeNull();
  });

  it("geeft null als het product geen naam heeft", async () => {
    fetch.mockResolvedValue(antwoord(200, { status: 1, product: { brands: "X" } }));
    expect(await opzoeken("8712345678906")).toBeNull();
  });

  it("gooit NietBereikbaar bij een storing of te veel verzoeken", async () => {
    fetch.mockResolvedValue(antwoord(503, {}));
    await expect(opzoeken("8712345678906")).rejects.toBeInstanceOf(NietBereikbaar);
    fetch.mockResolvedValue(antwoord(429, {}));
    await expect(opzoeken("8712345678913")).rejects.toBeInstanceOf(NietBereikbaar);
    fetch.mockRejectedValue(new TypeError("fetch failed"));
    await expect(opzoeken("8712345678920")).rejects.toBeInstanceOf(NietBereikbaar);
  });

  it("vraagt dezelfde barcode niet twee keer op", async () => {
    fetch.mockResolvedValue(antwoord(200, { status: 1, product: { product_name: "Appelmoes" } }));
    await opzoeken("8712345678906");
    await opzoeken("8712345678906");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("onthoudt een storing niet", async () => {
    fetch.mockResolvedValueOnce(antwoord(503, {}));
    await expect(opzoeken("8712345678906")).rejects.toBeInstanceOf(NietBereikbaar);
    fetch.mockResolvedValueOnce(antwoord(200, { status: 1, product: { product_name: "Appelmoes" } }));
    expect(await opzoeken("8712345678906")).toEqual({ naam: "Appelmoes" });
  });
});
