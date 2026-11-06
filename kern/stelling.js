// Rekenwerk aan een stelling: de kanten, de rijen en de vakken.
//
// Ook hier geen database. Wat er binnenkomt wordt gecontroleerd, en bij
// het aanpassen van een stelling wordt hier uitgerekend wat er bij komt
// en wat er af gaat. De dienst voert dat daarna uit.
//
// Een kant beschrijven we als { naam, rijen }, waarbij `rijen` een lijst
// is met per rij het aantal vakken: [6, 6, 4] betekent drie rijen, met
// zes, zes en vier producten naast elkaar. Rij 1 is de bovenste plank.

import { ongeldig } from "./hulp.js";
import * as controle from "./controle.js";

export const MAX_RIJEN_PER_KANT = 12;
export const MAX_VAKKEN_PER_RIJ = 30;

/**
 * Hoe de twee kanten heten. Bij een staande stelling (hoger dan breed)
 * is dat links en rechts, bij een liggende boven en onder. In de
 * database heten ze altijd LINKS en RECHTS; dit gaat alleen over wat
 * de gebruiker te lezen krijgt.
 */
export function kantLabels(breedte, hoogte) {
  return hoogte >= breedte
    ? { LINKS: "linkerkant", RECHTS: "rechterkant" }
    : { LINKS: "bovenkant", RECHTS: "onderkant" };
}

/**
 * Controleert beide kanten. Een kant zonder rijen bestaat niet (een
 * stelling tegen de muur), maar minstens één kant moet een rij hebben.
 */
export function controleerKanten(invoer, labels) {
  const kanten = {
    LINKS: controleerKant(invoer?.links, labels.LINKS),
    RECHTS: controleerKant(invoer?.rechts, labels.RECHTS),
  };

  if (!kanten.LINKS && !kanten.RECHTS) {
    throw ongeldig("Een stelling heeft minstens één kant met één rij nodig.");
  }

  return kanten;
}

function controleerKant(kant, label) {
  if (kant === undefined || kant === null) return null;
  if (typeof kant !== "object") throw ongeldig(`De ${label} is niet goed doorgegeven.`);

  const rijen = kant.rijen ?? [];
  if (!Array.isArray(rijen)) throw ongeldig(`De rijen van de ${label} moeten een lijst zijn.`);
  if (rijen.length === 0) return null;
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

/**
 * Wat er verandert aan één kant als de rijen van `oud` naar `nieuw`
 * gaan. Beide zijn lijsten met het aantal vakken per rij.
 *
 * - rijenWeg:    rijnummers die helemaal verdwijnen
 * - rijenErbij:  nieuwe rijen, met hun aantal vakken
 * - vakkenWeg:   per blijvende rij, vanaf welke plek de vakken weg gaan
 * - vakkenErbij: per blijvende rij, welke plekken erbij komen
 *
 * Er verdwijnen altijd vakken aan de rechterkant van een rij en rijen
 * aan de onderkant. Zo houdt een vak dat blijft dezelfde plek, en
 * blijft een partij die daar ligt dus ook op dezelfde plek liggen.
 */
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

/** "Koek en snoep, rij 2, vak 5": waar een partij ligt, leesbaar. */
export function plekNaam(kantNaam, rij, vak) {
  return `${kantNaam}, rij ${rij}, vak ${vak}`;
}
