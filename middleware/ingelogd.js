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

  const gebruiker = await Gebruiker.findByPk(uitToken.id);
  if (!gebruiker) throw nietIngelogd("Dit account bestaat niet meer.");

  req.gebruiker = gebruiker;
  next();
});

export const alleenLeidinggevende = (req, res, next) => {
  if (req.gebruiker?.rol !== "LEIDINGGEVENDE") {
    return next(geenToegang("Hier heb je de rol leidinggevende voor nodig."));
  }
  next();
};
