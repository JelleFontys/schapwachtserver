import jwt from "jsonwebtoken";

import { JWT_SECRET } from "./config.js";
import { nietIngelogd } from "./hulp.js";

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
    const inhoud = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return { id: inhoud.sub, winkelId: inhoud.winkelId, rol: inhoud.rol };
  } catch (fout) {
    if (fout.name === "TokenExpiredError") {
      throw nietIngelogd("Je sessie is verlopen, log opnieuw in.");
    }
    throw nietIngelogd("Ongeldig token.");
  }
}
