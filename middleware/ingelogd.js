// Afscherming van routes.
//
// `ingelogd` zet `req.gebruiker` klaar. Elke route achter deze
// middleware mag erop vertrouwen dat die er is. Routes halen het
// winkelId daar vandaan en nooit uit de body of de URL: anders kan
// iemand het winkelId van een andere winkel meesturen en zo bij
// gegevens komen die niet van hem zijn.

import { leesToken } from "../kern/token.js";
import { geenToegang, nietIngelogd, vangFouten } from "../kern/hulp.js";
import { Gebruiker } from "../modellen/index.js";

export const ingelogd = vangFouten(async (req, res, next) => {
  const kop = req.get("authorization") ?? "";
  const [soort, token] = kop.split(" ");

  if (soort?.toLowerCase() !== "bearer" || !token) {
    throw nietIngelogd("Je moet ingelogd zijn voor deze actie.");
  }

  const uitToken = leesToken(token);

  // Ook nog in de database kijken. Een token blijft acht uur geldig,
  // ook als het account in de tussentijd is verwijderd of een andere
  // rol heeft gekregen. De database is de waarheid, het token niet.
  const gebruiker = await Gebruiker.findByPk(uitToken.id);
  if (!gebruiker) throw nietIngelogd("Dit account bestaat niet meer.");

  req.gebruiker = gebruiker;
  next();
});

/** Alleen voor acties die een medewerker niet mag doen. */
export const alleenLeidinggevende = (req, res, next) => {
  if (req.gebruiker?.rol !== "LEIDINGGEVENDE") {
    return next(geenToegang("Hier heb je de rol leidinggevende voor nodig."));
  }
  next();
};
