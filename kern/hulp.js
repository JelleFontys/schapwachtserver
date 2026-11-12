import { randomUUID } from "node:crypto";

export const nieuwId = () => randomUUID();

export class HttpFout extends Error {
  constructor(status, bericht, gegevens = undefined) {
    super(bericht);
    this.name = "HttpFout";
    this.status = status;
    this.gegevens = gegevens;
  }
}

export const ongeldig = (bericht) => new HttpFout(400, bericht);
export const nietIngelogd = (bericht = "Niet ingelogd") => new HttpFout(401, bericht);
export const geenToegang = (bericht = "Geen toegang") => new HttpFout(403, bericht);
export const nietGevonden = (bericht = "Niet gevonden") => new HttpFout(404, bericht);

export const vangFouten = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function overDagen(dagen) {
  const datum = new Date();
  datum.setHours(12, 0, 0, 0);
  datum.setDate(datum.getDate() + dagen);
  return datum.toISOString().slice(0, 10);
}
