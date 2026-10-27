import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

import { maakToken, leesToken } from "../kern/token.js";
import { JWT_SECRET } from "../kern/config.js";

const gebruiker = {
  id: "11111111-1111-4111-8111-111111111111",
  winkelId: "22222222-2222-4222-8222-222222222222",
  rol: "LEIDINGGEVENDE",
};

describe("tokens", () => {
  it("leest er weer uit wat erin ging", () => {
    expect(leesToken(maakToken(gebruiker))).toEqual(gebruiker);
  });

  it("zet geen naam of e-mailadres in het token", () => {
    const inhoud = jwt.decode(maakToken({ ...gebruiker, naam: "Jelle", email: "a@b.nl" }));

    expect(inhoud).not.toHaveProperty("naam");
    expect(inhoud).not.toHaveProperty("email");
  });

  it("weigert een token dat met een andere sleutel is ondertekend", () => {
    const vals = jwt.sign({ winkelId: "x", rol: "LEIDINGGEVENDE" }, "andere-sleutel", {
      subject: gebruiker.id,
    });

    expect(() => leesToken(vals)).toThrowError(expect.objectContaining({ status: 401 }));
  });

  it("weigert een token zonder ondertekening", () => {
    // alg "none" betekent: geen ondertekening. Zou de server zelf
    // mogen kiezen welk algoritme hij accepteert, dan kon iedereen zo
    // een token verzinnen. Daarom staat HS256 vast in kern/token.js.
    const kop = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const inhoud = Buffer.from(
      JSON.stringify({ sub: gebruiker.id, winkelId: gebruiker.winkelId, rol: "LEIDINGGEVENDE" }),
    ).toString("base64url");

    expect(() => leesToken(`${kop}.${inhoud}.`)).toThrow();
  });

  it("weigert een verlopen token en zegt dat ook", () => {
    const verlopen = jwt.sign({ winkelId: gebruiker.winkelId, rol: "MEDEWERKER" }, JWT_SECRET, {
      subject: gebruiker.id,
      expiresIn: "-1s",
    });

    expect(() => leesToken(verlopen)).toThrow(/verlopen/);
  });

  it("weigert onzin", () => {
    expect(() => leesToken("dit-is-geen-token")).toThrow();
  });
});
