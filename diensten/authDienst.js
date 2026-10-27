// Alles rond registreren en inloggen.
//
// De routes nemen hier geen beslissingen: die lezen het verzoek en
// geven het antwoord. Wat er mag en wat er gebeurt staat hier, zodat
// het te testen is zonder dat er een Express-verzoek aan te pas komt.

import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { UniqueConstraintError } from "sequelize";

import { sequelize, Winkel, Gebruiker } from "../modellen/index.js";
import { HttpFout, ongeldig, nietIngelogd } from "../kern/hulp.js";
import { maakToken } from "../kern/token.js";
import * as controle from "../kern/controle.js";

// 10 ronden: bcrypt wordt daarmee traag genoeg dat gokken niet loont,
// maar snel genoeg dat inloggen niet merkbaar blijft hangen.
const BCRYPT_RONDEN = 10;

// Zonder 0, O, 1, I en L: die zijn niet van elkaar te onderscheiden
// als iemand de code overtypt van een briefje.
const CODE_TEKENS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function nieuweCode() {
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += CODE_TEKENS[randomInt(CODE_TEKENS.length)];
  }
  return code;
}

/** Wat de API over een gebruiker teruggeeft. Nooit de hash. */
const naarBuiten = (gebruiker) => ({
  id: gebruiker.id,
  naam: gebruiker.naam,
  email: gebruiker.email,
  rol: gebruiker.rol,
  winkelId: gebruiker.winkelId,
});

/**
 * Nieuw account.
 *
 * Een gebruiker hoort altijd bij een winkel, dus bij registreren moet
 * je er één kiezen: een nieuwe beginnen (dan ben je leidinggevende) of
 * je bij een bestaande aansluiten met een uitnodigingscode (dan ben je
 * medewerker). Zonder die keuze zou er een account zonder winkel
 * bestaan, en daar kan de app niets mee.
 */
export async function registreer(invoer) {
  const naam = controle.tekst(invoer.naam, "Naam", { max: 120 });
  const email = controle.email(invoer.email);
  const wachtwoord = controle.wachtwoord(invoer.wachtwoord);

  const nieuweWinkel = invoer.winkelnaam !== undefined && invoer.winkelnaam !== "";
  const aansluiten = invoer.uitnodigingscode !== undefined && invoer.uitnodigingscode !== "";

  if (nieuweWinkel === aansluiten) {
    throw ongeldig(
      "Kies één van beide: een nieuwe winkel beginnen, of je aansluiten met een uitnodigingscode.",
    );
  }

  const wachtwoordHash = await bcrypt.hash(wachtwoord, BCRYPT_RONDEN);

  try {
    const gebruiker = await sequelize.transaction(async (t) => {
      let winkel;
      let rol;

      if (nieuweWinkel) {
        winkel = await maakWinkelMetCode(
          controle.tekst(invoer.winkelnaam, "Winkelnaam", { max: 120 }),
          t,
        );
        rol = "LEIDINGGEVENDE";
      } else {
        const code = controle.uitnodigingscode(invoer.uitnodigingscode);
        winkel = await Winkel.findOne({ where: { uitnodigingscode: code }, transaction: t });
        if (!winkel) throw ongeldig("Deze uitnodigingscode hoort niet bij een winkel.");
        rol = "MEDEWERKER";
      }

      return Gebruiker.create(
        { winkelId: winkel.id, naam, email, wachtwoordHash, rol },
        { transaction: t },
      );
    });

    return { gebruiker: naarBuiten(gebruiker), token: maakToken(gebruiker) };
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) {
      // Niet verklappen of dit e-mailadres al bestaat zou netter zijn,
      // maar dan kan iemand geen account aanmaken zonder te weten
      // waarom het niet lukt. Bij registreren weegt duidelijkheid hier
      // zwaarder; bij inloggen is dat omgekeerd.
      throw new HttpFout(409, "Er bestaat al een account met dit e-mailadres.");
    }
    throw fout;
  }
}

/**
 * Winkel aanmaken met een unieke code. De kans dat twee winkels
 * dezelfde code krijgen is klein, maar niet nul, dus bij een botsing
 * proberen we het opnieuw in plaats van de registratie te laten falen.
 */
async function maakWinkelMetCode(naam, transaction, pogingen = 5) {
  for (let poging = 1; poging <= pogingen; poging++) {
    try {
      return await Winkel.create(
        { naam, uitnodigingscode: nieuweCode() },
        { transaction },
      );
    } catch (fout) {
      const laatstePoging = poging === pogingen;
      if (!(fout instanceof UniqueConstraintError) || laatstePoging) throw fout;
    }
  }
}

/**
 * Inloggen.
 *
 * Bij een onbekend e-mailadres en bij een fout wachtwoord komt exact
 * dezelfde melding terug. Zou de melding verschillen, dan kan iemand
 * er achter komen welke e-mailadressen een account hebben.
 */
export async function logIn(invoer) {
  const email = controle.email(invoer.email);
  const wachtwoord = typeof invoer.wachtwoord === "string" ? invoer.wachtwoord : "";

  const gebruiker = await Gebruiker.scope("metWachtwoord").findOne({ where: { email } });

  // Ook bij een onbekend e-mailadres een hash controleren. Anders is
  // een mislukte poging meetbaar sneller dan een geslaagde, en daarmee
  // is te zien of een adres bestaat.
  const hash = gebruiker?.wachtwoordHash ?? "$2b$10$ongeldigehashalsvervangingvoornietsxxxxxxxxxxxxxxxxxxxxxx";
  const klopt = await bcrypt.compare(wachtwoord, hash);

  if (!gebruiker || !klopt) {
    throw nietIngelogd("E-mailadres of wachtwoord is niet juist.");
  }

  return { gebruiker: naarBuiten(gebruiker), token: maakToken(gebruiker) };
}

export { naarBuiten };
