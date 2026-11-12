import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { UniqueConstraintError } from "sequelize";

import { sequelize, Winkel, Gebruiker } from "../modellen/index.js";
import { HttpFout, ongeldig, nietIngelogd } from "../kern/hulp.js";
import { maakToken } from "../kern/token.js";
import * as controle from "../kern/controle.js";

const BCRYPT_RONDEN = 10;

const CODE_TEKENS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function nieuweCode() {
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += CODE_TEKENS[randomInt(CODE_TEKENS.length)];
  }
  return code;
}

const naarBuiten = (gebruiker) => ({
  id: gebruiker.id,
  naam: gebruiker.naam,
  email: gebruiker.email,
  rol: gebruiker.rol,
  winkelId: gebruiker.winkelId,
});

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
      throw new HttpFout(409, "Er bestaat al een account met dit e-mailadres.");
    }
    throw fout;
  }
}

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

export async function logIn(invoer) {
  const email = controle.email(invoer.email);
  const wachtwoord = typeof invoer.wachtwoord === "string" ? invoer.wachtwoord : "";

  const gebruiker = await Gebruiker.scope("metWachtwoord").findOne({ where: { email } });

  const hash = gebruiker?.wachtwoordHash ?? "$2b$10$ongeldigehashalsvervangingvoornietsxxxxxxxxxxxxxxxxxxxxxx";
  const klopt = await bcrypt.compare(wachtwoord, hash);

  if (!gebruiker || !klopt) {
    throw nietIngelogd("E-mailadres of wachtwoord is niet juist.");
  }

  return { gebruiker: naarBuiten(gebruiker), token: maakToken(gebruiker) };
}

export { naarBuiten };
