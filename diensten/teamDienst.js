// Wie er bij de winkel hoort en wat ze mogen (SW-40).
//
// Er zijn twee rollen. De leidinggevende richt de plattegrond in, stelt
// de afprijsregels in en ziet het overzicht van wat er is weggegooid. De
// medewerker doet het werk op de vloer: producten in vakken zetten,
// afmelden, scannen.

import { Gebruiker } from "../modellen/index.js";
import { HttpFout, nietGevonden } from "../kern/hulp.js";
import { ROLLEN } from "../modellen/Gebruiker.js";
import * as controle from "../kern/controle.js";

const naarBuiten = (g) => ({ id: g.id, naam: g.naam, email: g.email, rol: g.rol });

export async function lijst(winkelId) {
  const leden = await Gebruiker.findAll({ where: { winkelId }, order: [["naam", "ASC"]] });
  return leden.map(naarBuiten);
}

/**
 * De rol van iemand in de winkel aanpassen.
 *
 * De laatste leidinggevende kan niet worden teruggezet naar medewerker,
 * ook niet door zichzelf. Dan zou er niemand meer zijn die de
 * plattegrond of de afprijsregels kan aanpassen, en is dat ook niet meer
 * te herstellen vanuit de app.
 */
export async function wijzigRol(winkelId, id, invoer) {
  const rol = controle.keuze(invoer.rol, "Rol", ROLLEN);
  const lid = await Gebruiker.findOne({ where: { id, winkelId } });
  if (!lid) throw nietGevonden("Deze persoon hoort niet bij jouw winkel.");

  if (lid.rol === "LEIDINGGEVENDE" && rol === "MEDEWERKER") {
    const leidinggevenden = await Gebruiker.count({ where: { winkelId, rol: "LEIDINGGEVENDE" } });
    if (leidinggevenden <= 1) {
      throw new HttpFout(
        409,
        "Dit is de enige leidinggevende. Maak eerst iemand anders leidinggevende.",
      );
    }
  }

  await lid.update({ rol });
  return naarBuiten(lid);
}
