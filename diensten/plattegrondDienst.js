import { UniqueConstraintError } from "sequelize";

import {
  sequelize,
  Plattegrond,
  Stelling,
  Stellingkant,
  Plank,
  Vak,
  Partij,
  Product,
  Productgroep,
} from "../modellen/index.js";
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
import { afprijsDagenVan, ernstigste, statusVan } from "../kern/status.js";

const naarBuiten = (plattegrond) => ({
  id: plattegrond.id,
  naam: plattegrond.naam,
  rijen: plattegrond.rijen,
  kolommen: plattegrond.kolommen,
});

const kantNaarBuiten = (kant, statusPerKant) =>
  kant
    ? {
        naam: kant.naam,
        rijen: [...kant.planken]
          .sort((a, b) => a.nummer - b.nummer)
          .map((plank) => plank.vakken.length),
        status: statusPerKant.get(kant.id) ?? null,
      }
    : null;

export function stellingNaarBuiten(stelling, statusPerKant = new Map()) {
  const kant = (welke) => stelling.kanten.find((k) => k.kant === welke);
  return {
    id: stelling.id,
    x: stelling.x,
    y: stelling.y,
    breedte: stelling.breedte,
    hoogte: stelling.hoogte,
    links: kantNaarBuiten(kant("LINKS"), statusPerKant),
    rechts: kantNaarBuiten(kant("RECHTS"), statusPerKant),
  };
}

async function statussenPerKant(plattegrondId) {
  const partijen = await Partij.findAll({
    where: { status: "ACTIEF" },
    attributes: ["id", "houdbaarTot"],
    include: [
      {
        model: Vak,
        required: true,
        attributes: ["id"],
        include: [
          {
            model: Plank,
            required: true,
            attributes: ["stellingkantId"],
            include: [
              {
                model: Stellingkant,
                required: true,
                attributes: ["id"],
                include: [
                  { model: Stelling, required: true, attributes: ["id"], where: { plattegrondId } },
                ],
              },
            ],
          },
        ],
      },
      {
        model: Product,
        required: true,
        attributes: ["id"],
        include: [{ model: Productgroep, attributes: ["afprijsDagen"] }],
      },
    ],
  });

  const perKant = new Map();
  for (const partij of partijen) {
    const kantId = partij.Vak.Plank.stellingkantId;
    const status = statusVan(partij.houdbaarTot, afprijsDagenVan(partij.Product));
    perKant.set(kantId, ernstigste([perKant.get(kantId), status]));
  }
  return perKant;
}

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

export function stellingNaam(stelling) {
  const namen = stelling.kanten.map((k) => k.naam);
  return namen.length > 0 ? namen.join(" / ") : "zonder naam";
}

const naamBestaatAl = () =>
  new HttpFout(409, "Er is in deze winkel al een plattegrond met deze naam.");

export async function zoek(winkelId, id, transaction) {
  const plattegrond = await Plattegrond.findOne({
    where: { id, winkelId },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!plattegrond) throw nietGevonden("Deze plattegrond bestaat niet.");
  return plattegrond;
}

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

  const statusPerKant = await statussenPerKant(plattegrond.id);

  return {
    ...naarBuiten(plattegrond),
    stellingen: stellingen.map((stelling) => stellingNaarBuiten(stelling, statusPerKant)),
  };
}

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
