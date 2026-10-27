// Inlogtokens maken en lezen (JWT).
//
// Er staat alleen in wie je bent, bij welke winkel je hoort en welke
// rol je hebt. Geen naam, geen e-mailadres: een token kan door de
// browser bewaard worden en hoeft geen gegevens te bevatten die daar
// niet nodig zijn.

import jwt from "jsonwebtoken";

import { JWT_SECRET } from "./config.js";
import { nietIngelogd } from "./hulp.js";

// Acht uur: lang genoeg voor een dienst, kort genoeg dat een token op
// een vergeten telefoon niet maanden geldig blijft.
const GELDIG = "8h";

export function maakToken(gebruiker) {
  return jwt.sign(
    { winkelId: gebruiker.winkelId, rol: gebruiker.rol },
    JWT_SECRET,
    { subject: gebruiker.id, expiresIn: GELDIG, algorithm: "HS256" },
  );
}

export function leesToken(token) {
  try {
    // algorithms expliciet meegeven: anders mag de afzender zelf
    // bepalen hoe het token ondertekend is, en dat wil je niet.
    const inhoud = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return { id: inhoud.sub, winkelId: inhoud.winkelId, rol: inhoud.rol };
  } catch (fout) {
    if (fout.name === "TokenExpiredError") {
      throw nietIngelogd("Je sessie is verlopen, log opnieuw in.");
    }
    throw nietIngelogd("Ongeldig token.");
  }
}
