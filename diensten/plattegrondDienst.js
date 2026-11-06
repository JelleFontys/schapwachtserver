// Plattegronden: de vloer van een ruimte, met de stellingen erop.
//
// Elke functie krijgt het winkelId mee als eerste argument, en elke
// query filtert erop. Een plattegrond van een andere winkel bestaat
// voor deze code niet: je krijgt 404, niet 403. Een 403 zou verklappen
// dat er onder dat id wél iets staat.

import { UniqueConstraintError } from "sequelize";

import { sequelize, Plattegrond, Stelling, Stellingkant, Plank, Vak } from "../modellen/index.js";
import { HttpFout, nietGevonden, ongeldig } from "../kern/hulp.js";
import * as controle from "../kern/controle.js";
import {
  STANDAARD,
  MAX_RIJEN,
  MAX_KOLOMMEN,
  RANDEN,
  ACTIES,
  raaktRand,
  randWijziging,
} from "../kern/raster.js";

const naarBuiten = (plattegrond) => ({
  id: plattegrond.id,
  naam: plattegrond.naam,
  rijen: plattegrond.rijen,
  kolommen: plattegrond.kolommen,
});

const kantNaarBuiten = (kant) =>
  kant
    ? {
        naam: kant.naam,
        rijen: [...kant.planken]
          .sort((a, b) => a.nummer - b.nummer)
          .map((plank) => plank.vakken.length),
      }
    : null;

/** Een stelling zoals de API hem teruggeeft. */
export function stellingNaarBuiten(stelling) {
  const kant = (welke) => stelling.kanten.find((k) => k.kant === welke);
  return {
    id: stelling.id,
    x: stelling.x,
    y: stelling.y,
    breedte: stelling.breedte,
    hoogte: stelling.hoogte,
    links: kantNaarBuiten(kant("LINKS")),
    rechts: kantNaarBuiten(kant("RECHTS")),
  };
}

/** Alles wat nodig is om een stelling met zijn kanten en vakken te laden. */
export const stellingMetInhoud = [
  {
    model: Stellingkant,
    as: "kanten",
    include: [
      {
        model: Plank,
        as: "planken",
        include: [{ model: Vak, as: "vakken", attributes: ["id", "positie"] }],
      },
    ],
  },
];

/** Hoe een stelling heet in een melding: de namen van de kanten. */
export function stellingNaam(stelling) {
  const namen = stelling.kanten.map((k) => k.naam);
  return namen.length > 0 ? namen.join(" / ") : "zonder naam";
}

const naamBestaatAl = () =>
  new HttpFout(409, "Er is in deze winkel al een plattegrond met deze naam.");

/**
 * Een plattegrond van deze winkel, of 404.
 *
 * Binnen een transactie wordt de rij vergrendeld tot de transactie
 * klaar is. Alles wat aan de vloer of de stellingen erop verandert,
 * loopt via deze vergrendeling. Zo kunnen twee mensen niet tegelijk een
 * stelling op dezelfde plek zetten.
 */
export async function zoek(winkelId, id, transaction) {
  const plattegrond = await Plattegrond.findOne({
    where: { id, winkelId },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!plattegrond) throw nietGevonden("Deze plattegrond bestaat niet.");
  return plattegrond;
}

/** Alle plattegronden van de winkel, zonder stellingen. */
export async function lijst(winkelId) {
  const plattegronden = await Plattegrond.findAll({
    where: { winkelId },
    order: [
      ["aangemaakt_op", "ASC"],
      ["naam", "ASC"],
    ],
  });
  return plattegronden.map(naarBuiten);
}

/** Eén plattegrond met al zijn stellingen. */
export async function haal(winkelId, id) {
  const plattegrond = await zoek(winkelId, id);
  const stellingen = await Stelling.findAll({
    where: { plattegrondId: plattegrond.id },
    include: stellingMetInhoud,
    order: [
      ["y", "ASC"],
      ["x", "ASC"],
    ],
  });

  return { ...naarBuiten(plattegrond), stellingen: stellingen.map(stellingNaarBuiten) };
}

/**
 * Nieuwe plattegrond: alleen een naam. Hij begint als een lege vloer
 * van standaardgrootte, en wordt daarna met de plusjes groter.
 */
export async function maak(winkelId, invoer) {
  const naam = controle.tekst(invoer.naam, "Naam", { max: 120 });

  try {
    const plattegrond = await Plattegrond.create({ winkelId, naam, ...STANDAARD });
    return haal(winkelId, plattegrond.id);
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) throw naamBestaatAl();
    throw fout;
  }
}

/** Een plattegrond een andere naam geven. */
export async function hernoem(winkelId, id, invoer) {
  const naam = controle.tekst(invoer.naam, "Naam", { max: 120 });

  try {
    const plattegrond = await zoek(winkelId, id);
    plattegrond.naam = naam;
    await plattegrond.save();
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) throw naamBestaatAl();
    throw fout;
  }

  return haal(winkelId, id);
}

/**
 * Een rij of kolom erbij of eraf aan één rand van de vloer.
 *
 * Eraf kan alleen als er op die rand geen stelling staat. Er wordt
 * nooit stilletjes een stelling afgeknipt of weggehaald; dan moet
 * iemand die stelling eerst zelf weghalen.
 */
export async function pasRandAan(winkelId, id, invoer) {
  const { rand, actie } = invoer;
  if (!RANDEN.includes(rand)) throw ongeldig(`Rand moet een van deze zijn: ${RANDEN.join(", ")}.`);
  if (!ACTIES.includes(actie)) throw ongeldig("Actie moet 'erbij' of 'eraf' zijn.");

  await sequelize.transaction(async (t) => {
    const plattegrond = await zoek(winkelId, id, t);
    const wijziging = randWijziging(rand, actie);

    const rijen = plattegrond.rijen + wijziging.rijen;
    const kolommen = plattegrond.kolommen + wijziging.kolommen;

    if (rijen < 1 || kolommen < 1) {
      throw ongeldig("Kleiner kan niet: er moet minstens één rij en één kolom overblijven.");
    }
    if (rijen > MAX_RIJEN || kolommen > MAX_KOLOMMEN) {
      throw ongeldig(`Groter kan niet: maximaal ${MAX_KOLOMMEN} breed en ${MAX_RIJEN} hoog.`);
    }

    if (actie === "eraf") {
      const stellingen = await Stelling.findAll({
        where: { plattegrondId: plattegrond.id },
        include: [{ model: Stellingkant, as: "kanten", attributes: ["naam"] }],
        transaction: t,
      });
      const inDeWeg = stellingen.find((s) =>
        raaktRand(s, rand, plattegrond.rijen, plattegrond.kolommen),
      );
      if (inDeWeg) {
        throw new HttpFout(
          409,
          `Tegen deze rand staat een stelling (${stellingNaam(inDeWeg)}). Haal die eerst weg.`,
          { stellingId: inDeWeg.id },
        );
      }
    }

    if (wijziging.schuifX !== 0 || wijziging.schuifY !== 0) {
      await Stelling.increment(
        { x: wijziging.schuifX, y: wijziging.schuifY },
        { where: { plattegrondId: plattegrond.id }, transaction: t },
      );
    }

    plattegrond.rijen = rijen;
    plattegrond.kolommen = kolommen;
    await plattegrond.save({ transaction: t });
  });

  return haal(winkelId, id);
}
