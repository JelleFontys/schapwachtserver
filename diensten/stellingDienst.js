// Stellingen op een plattegrond: aanmaken, aanpassen en weghalen.
//
// Een stelling aanpassen kan vakken laten verdwijnen: een rij minder,
// minder producten op een rij, of een hele kant weg. Ligt er in zo'n
// vak nog een product, dan raakt dat zijn plek kwijt. Dat gebeurt
// nooit ongemerkt. Zonder `losmaken: true` weigert de server en noemt
// hij welke producten op welke plek het betreft. De producten worden
// daarna losgemaakt, nooit verwijderd.

import { Op } from "sequelize";

import {
  sequelize,
  Plattegrond,
  Stelling,
  Stellingkant,
  Plank,
  Vak,
  Partij,
  Product,
} from "../modellen/index.js";
import { HttpFout, nietGevonden, ongeldig } from "../kern/hulp.js";
import * as controle from "../kern/controle.js";
import { MAX_KOLOMMEN, MAX_RIJEN, binnenRaster, overlappen } from "../kern/raster.js";
import { controleerKanten, verschilRijen, plekNaam } from "../kern/stelling.js";
import { zoek, stellingNaarBuiten, stellingMetInhoud } from "./plattegrondDienst.js";

const KANTEN = ["LINKS", "RECHTS"];

/** Een stelling van deze winkel met alles erin, of 404. */
async function zoekStelling(winkelId, id, transaction) {
  const stelling = await Stelling.findOne({
    where: { id },
    include: [
      { model: Plattegrond, where: { winkelId }, attributes: ["id"] },
      ...stellingMetInhoud,
    ],
    transaction,
  });
  if (!stelling) throw nietGevonden("Deze stelling bestaat niet.");
  return stelling;
}

export async function haal(winkelId, id) {
  const stelling = await zoekStelling(winkelId, id);
  return { ...stellingNaarBuiten(stelling), plattegrondId: stelling.plattegrondId };
}

/** Een kant met zijn rijen en vakken aanmaken. */
async function maakKant(stellingId, kant, spec, transaction) {
  const nieuweKant = await Stellingkant.create(
    { stellingId, kant, naam: spec.naam },
    { transaction },
  );
  await maakRijen(
    nieuweKant.id,
    spec.rijen.map((vakken, i) => ({ nummer: i + 1, vakken })),
    transaction,
  );
}

async function maakRijen(stellingkantId, rijen, transaction) {
  if (rijen.length === 0) return;

  const planken = await Plank.bulkCreate(
    rijen.map((rij) => ({ stellingkantId, nummer: rij.nummer })),
    { transaction },
  );
  await maakVakken(
    planken.map((plank, i) => ({ plankId: plank.id, van: 1, tot: rijen[i].vakken })),
    transaction,
  );
}

async function maakVakken(reeksen, transaction) {
  const vakken = reeksen.flatMap(({ plankId, van, tot }) =>
    Array.from({ length: tot - van + 1 }, (_, i) => ({ plankId, positie: van + i })),
  );
  if (vakken.length > 0) await Vak.bulkCreate(vakken, { transaction });
}

/**
 * Nieuwe stelling op een plattegrond. Hij moet binnen het raster
 * vallen, mag niet over een andere stelling heen liggen en is
 * maximaal 2 hokjes dik.
 */
export async function maak(winkelId, plattegrondId, invoer) {
  const vlak = {
    x: controle.geheelGetal(invoer.x, "x", { min: 1, max: MAX_KOLOMMEN }),
    y: controle.geheelGetal(invoer.y, "y", { min: 1, max: MAX_RIJEN }),
    breedte: controle.geheelGetal(invoer.breedte, "Breedte", { min: 1, max: MAX_KOLOMMEN }),
    hoogte: controle.geheelGetal(invoer.hoogte, "Hoogte", { min: 1, max: MAX_RIJEN }),
  };
  // Ook de dikte: een stelling van 3 hokjes dik komt er niet in.
  const kanten = controleerKanten(invoer, vlak);

  const id = await sequelize.transaction(async (t) => {
    const plattegrond = await zoek(winkelId, plattegrondId, t);

    if (!binnenRaster(vlak, plattegrond.rijen, plattegrond.kolommen)) {
      throw ongeldig("Deze stelling valt (deels) buiten de plattegrond.");
    }

    const anderen = await Stelling.findAll({
      where: { plattegrondId: plattegrond.id },
      transaction: t,
    });
    if (anderen.some((ander) => overlappen(vlak, ander))) {
      throw new HttpFout(409, "Hier staat al een stelling. Een stelling mag niet over een andere heen.");
    }

    const stelling = await Stelling.create(
      { plattegrondId: plattegrond.id, ...vlak },
      { transaction: t },
    );
    for (const kant of KANTEN) {
      if (kanten[kant]) await maakKant(stelling.id, kant, kanten[kant], t);
    }
    return stelling.id;
  });

  return haal(winkelId, id);
}

/**
 * Namen, rijen en vakken van een stelling aanpassen. Plek en grootte
 * op de vloer blijven hetzelfde.
 */
export async function wijzig(winkelId, id, invoer) {
  const losmaken = invoer.losmaken === true;

  await sequelize.transaction(async (t) => {
    const stelling = await zoekStelling(winkelId, id, t);
    // Dezelfde vergrendeling als bij de vloer, zodat er niet tegelijk
    // aan dezelfde plattegrond gewerkt wordt.
    await zoek(winkelId, stelling.plattegrondId, t);

    const kanten = controleerKanten(invoer, stelling);

    // Eerst alles uitrekenen, dan pas iets veranderen. Zo kan de server
    // weigeren voordat er ook maar één vak weg is.
    const plan = { vakkenWeg: [], plankenWeg: [], kantenWeg: [], plekken: new Map(), daarna: [] };

    for (const kant of KANTEN) {
      const bestaand = stelling.kanten.find((k) => k.kant === kant);
      const nieuw = kanten[kant];

      if (!bestaand && nieuw) {
        plan.daarna.push(() => maakKant(stelling.id, kant, nieuw, t));
      } else if (bestaand && !nieuw) {
        plan.kantenWeg.push(bestaand.id);
        for (const plank of bestaand.planken) zetWeg(plan, bestaand, plank, plank.vakken);
      } else if (bestaand && nieuw) {
        planKant(plan, bestaand, nieuw, t);
      }
    }

    await maakPlekkenVrij(plan, losmaken, t);

    if (plan.vakkenWeg.length > 0) {
      await Vak.destroy({ where: { id: { [Op.in]: plan.vakkenWeg } }, transaction: t });
    }
    if (plan.plankenWeg.length > 0) {
      await Plank.destroy({ where: { id: { [Op.in]: plan.plankenWeg } }, transaction: t });
    }
    if (plan.kantenWeg.length > 0) {
      await Stellingkant.destroy({ where: { id: { [Op.in]: plan.kantenWeg } }, transaction: t });
    }
    for (const stap of plan.daarna) await stap();

    stelling.changed("bijgewerkt_op", true);
    await stelling.save({ transaction: t });
  });

  return haal(winkelId, id);
}

/** Wat er aan één bestaande kant verandert, in het plan zetten. */
function planKant(plan, bestaand, nieuw, transaction) {
  const planken = [...bestaand.planken].sort((a, b) => a.nummer - b.nummer);
  const plankMetNummer = (nummer) => planken.find((p) => p.nummer === nummer);
  const verschil = verschilRijen(
    planken.map((p) => p.vakken.length),
    nieuw.rijen,
  );

  for (const nummer of verschil.rijenWeg) {
    const plank = plankMetNummer(nummer);
    plan.plankenWeg.push(plank.id);
    zetWeg(plan, bestaand, plank, plank.vakken);
  }
  for (const { nummer, vanaf } of verschil.vakkenWeg) {
    const plank = plankMetNummer(nummer);
    zetWeg(plan, bestaand, plank, plank.vakken.filter((v) => v.positie >= vanaf));
  }

  if (bestaand.naam !== nieuw.naam) {
    plan.daarna.push(() => bestaand.update({ naam: nieuw.naam }, { transaction }));
  }
  if (verschil.rijenErbij.length > 0) {
    plan.daarna.push(() => maakRijen(bestaand.id, verschil.rijenErbij, transaction));
  }
  if (verschil.vakkenErbij.length > 0) {
    plan.daarna.push(() =>
      maakVakken(
        verschil.vakkenErbij.map(({ nummer, van, tot }) => ({
          plankId: plankMetNummer(nummer).id,
          van,
          tot,
        })),
        transaction,
      ),
    );
  }
}

function zetWeg(plan, kant, plank, vakken) {
  for (const vak of vakken) {
    plan.vakkenWeg.push(vak.id);
    plan.plekken.set(vak.id, plekNaam(kant.naam, plank.nummer, vak.positie));
  }
}

/**
 * Producten in vakken die verdwijnen: weigeren als niemand heeft
 * bevestigd, anders losmaken.
 *
 * Alleen actieve partijen tellen mee voor de weigering. Een afgemelde
 * partij is geschiedenis; die mag zijn plek kwijtraken zonder dat
 * iemand daarvoor gewaarschuwd hoeft te worden.
 */
async function maakPlekkenVrij(plan, losmaken, transaction) {
  if (plan.vakkenWeg.length === 0) return;

  const geraakt = await Partij.findAll({
    where: { vakId: { [Op.in]: plan.vakkenWeg }, status: "ACTIEF" },
    include: [{ model: Product, attributes: ["naam"] }],
    transaction,
  });

  if (geraakt.length > 0 && !losmaken) {
    throw new HttpFout(
      409,
      geraakt.length === 1
        ? "Hierdoor raakt 1 product zijn plek kwijt."
        : `Hierdoor raken ${geraakt.length} producten hun plek kwijt.`,
      {
        aantal: geraakt.length,
        geraakt: geraakt.map((partij) => ({
          plek: plan.plekken.get(partij.vakId),
          product: partij.Product?.naam ?? "Onbekend product",
        })),
      },
    );
  }

  // Losmaken, niet verwijderen. De database zou dit bij het weghalen
  // van de vakken ook zelf doen (ON DELETE SET NULL), maar hier staat
  // het zichtbaar in de code, zodat je niet hoeft te weten hoe de
  // koppeling is ingesteld om te snappen wat er gebeurt.
  await Partij.update(
    { vakId: null },
    { where: { vakId: { [Op.in]: plan.vakkenWeg } }, transaction },
  );
}

/** Een stelling weghalen. Zelfde regel: producten worden losgemaakt. */
export async function verwijder(winkelId, id, { losmaken = false } = {}) {
  await sequelize.transaction(async (t) => {
    const stelling = await zoekStelling(winkelId, id, t);
    await zoek(winkelId, stelling.plattegrondId, t);

    const plan = { vakkenWeg: [], plekken: new Map() };
    for (const kant of stelling.kanten) {
      for (const plank of kant.planken) zetWeg(plan, kant, plank, plank.vakken);
    }

    await maakPlekkenVrij(plan, losmaken, t);
    await stelling.destroy({ transaction: t });
  });
}
