import { ongeldig } from "./hulp.js";
import * as controle from "./controle.js";

export const MAX_RIJEN_PER_KANT = 12;
export const MAX_VAKKEN_PER_RIJ = 30;

export const MAX_DIKTE = 2;

export function dikte(vlak) {
  return Math.min(vlak.breedte, vlak.hoogte);
}

export function kantLabels(vlak) {
  if (dikte(vlak) === 1) return { LINKS: "stelling", RECHTS: null };
  return vlak.hoogte >= vlak.breedte
    ? { LINKS: "linkerkant", RECHTS: "rechterkant" }
    : { LINKS: "bovenkant", RECHTS: "onderkant" };
}

export function controleerDikte(vlak) {
  if (dikte(vlak) > MAX_DIKTE) {
    throw ongeldig(`Een stelling is maximaal ${MAX_DIKTE} hokjes dik.`);
  }
}

export function controleerKanten(invoer, vlak) {
  controleerDikte(vlak);
  const labels = kantLabels(vlak);

  if (dikte(vlak) === 1) {
    if (invoer?.rechts !== undefined && invoer?.rechts !== null) {
      throw ongeldig("Een stelling van één hokje dik heeft maar één kant.");
    }
    return { LINKS: controleerKant(invoer?.links, labels.LINKS), RECHTS: null };
  }

  return {
    LINKS: controleerKant(invoer?.links, labels.LINKS),
    RECHTS: controleerKant(invoer?.rechts, labels.RECHTS),
  };
}

function controleerKant(kant, label) {
  if (kant === undefined || kant === null || typeof kant !== "object") {
    throw ongeldig(`De ${label} ontbreekt.`);
  }

  const rijen = kant.rijen ?? [];
  if (!Array.isArray(rijen)) throw ongeldig(`De rijen van de ${label} moeten een lijst zijn.`);
  if (rijen.length === 0) throw ongeldig(`De ${label} heeft minstens één rij nodig.`);
  if (rijen.length > MAX_RIJEN_PER_KANT) {
    throw ongeldig(`De ${label} kan maximaal ${MAX_RIJEN_PER_KANT} rijen hebben.`);
  }

  return {
    naam: controle.tekst(kant.naam, `Naam van de ${label}`, { max: 120 }),
    rijen: rijen.map((aantal, i) =>
      controle.geheelGetal(aantal, `Rij ${i + 1} van de ${label}`, {
        min: 1,
        max: MAX_VAKKEN_PER_RIJ,
      }),
    ),
  };
}

export function verschilRijen(oud, nieuw) {
  const uit = { rijenWeg: [], rijenErbij: [], vakkenWeg: [], vakkenErbij: [] };

  for (let nummer = 1; nummer <= Math.max(oud.length, nieuw.length); nummer++) {
    const was = oud[nummer - 1];
    const wordt = nieuw[nummer - 1];

    if (wordt === undefined) {
      uit.rijenWeg.push(nummer);
    } else if (was === undefined) {
      uit.rijenErbij.push({ nummer, vakken: wordt });
    } else if (wordt < was) {
      uit.vakkenWeg.push({ nummer, vanaf: wordt + 1 });
    } else if (wordt > was) {
      uit.vakkenErbij.push({ nummer, van: was + 1, tot: wordt });
    }
  }

  return uit;
}

export function plekNaam(kantNaam, rij, vak) {
  return `${kantNaam}, rij ${rij}, vak ${vak}`;
}
