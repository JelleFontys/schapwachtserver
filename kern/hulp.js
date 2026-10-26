// Kleine hulpfuncties die op meerdere plekken terugkomen.

import { randomUUID } from "node:crypto";

/** Nieuw id voor een rij in de database. */
export const nieuwId = () => randomUUID();

/** Fout met een HTTP-status erbij, zodat de foutafhandeling hem herkent. */
export class HttpFout extends Error {
  constructor(status, bericht) {
    super(bericht);
    this.name = "HttpFout";
    this.status = status;
  }
}

export const ongeldig = (bericht) => new HttpFout(400, bericht);
export const nietIngelogd = (bericht = "Niet ingelogd") => new HttpFout(401, bericht);
export const geenToegang = (bericht = "Geen toegang") => new HttpFout(403, bericht);
export const nietGevonden = (bericht = "Niet gevonden") => new HttpFout(404, bericht);

/**
 * Vangt fouten uit async routes op en geeft ze door aan de
 * foutafhandeling. Zonder dit blijft een afgewezen promise in Express
 * hangen en krijgt de gebruiker nooit antwoord.
 */
export const vangFouten = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Datum over `dagen` dagen als "jjjj-mm-dd". */
export function overDagen(dagen) {
  const datum = new Date();
  datum.setHours(12, 0, 0, 0);
  datum.setDate(datum.getDate() + dagen);
  return datum.toISOString().slice(0, 10);
}
