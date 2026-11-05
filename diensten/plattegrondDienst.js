// Plattegronden en hun vakken.
//
// Elke functie krijgt het winkelId mee als eerste argument, en elke
// query filtert erop. Een plattegrond van een andere winkel bestaat
// voor deze code niet: je krijgt 404, niet 403. Een 403 zou verklappen
// dat er onder dat id wél iets staat.

import { Op, UniqueConstraintError } from "sequelize";

import { sequelize, Plattegrond, Vak, Partij, Product } from "../modellen/index.js";
import { HttpFout, nietGevonden } from "../kern/hulp.js";
import * as controle from "../kern/controle.js";
import {
  MAX_RIJEN,
  MAX_KOLOMMEN,
  positie,
  valtBuiten,
  ontbrekendePosities,
} from "../kern/raster.js";

const naarBuiten = (plattegrond) => ({
  id: plattegrond.id,
  naam: plattegrond.naam,
  rijen: plattegrond.rijen,
  kolommen: plattegrond.kolommen,
});

const vakNaarBuiten = (vak) => ({
  id: vak.id,
  rij: vak.rij,
  kolom: vak.kolom,
  positie: positie(vak.rij, vak.kolom),
  naam: vak.naam,
});

const controleerRijen = (waarde) =>
  controle.geheelGetal(waarde, "Aantal rijen", { min: 1, max: MAX_RIJEN });

const controleerKolommen = (waarde) =>
  controle.geheelGetal(waarde, "Aantal kolommen", { min: 1, max: MAX_KOLOMMEN });

const naamBestaatAl = () =>
  new HttpFout(409, "Er is in deze winkel al een plattegrond met deze naam.");

/** Een plattegrond van deze winkel, of 404. */
async function zoek(winkelId, id, transaction) {
  const plattegrond = await Plattegrond.findOne({
    where: { id, winkelId },
    transaction,
    // Bij het aanpassen van het raster mag niemand anders tegelijk
    // hetzelfde raster aanpassen, anders tellen we vakken die een
    // ander verzoek net aan het weghalen is.
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!plattegrond) throw nietGevonden("Deze plattegrond bestaat niet.");
  return plattegrond;
}

/** Alle plattegronden van de winkel, zonder vakken. */
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

/** Eén plattegrond met al zijn vakken, rij voor rij. */
export async function haal(winkelId, id) {
  const plattegrond = await zoek(winkelId, id);
  const vakken = await Vak.findAll({
    where: { plattegrondId: plattegrond.id },
    order: [
      ["rij", "ASC"],
      ["kolom", "ASC"],
    ],
  });

  return { ...naarBuiten(plattegrond), vakken: vakken.map(vakNaarBuiten) };
}

/**
 * Nieuwe plattegrond. Alle vakken worden meteen aangemaakt, ook de
 * lege. Een partij moet straks naar een vak kunnen verwijzen, en dan
 * moet dat vak al bestaan.
 */
export async function maak(winkelId, invoer) {
  const naam = controle.tekst(invoer.naam, "Naam", { max: 120 });
  const rijen = controleerRijen(invoer.rijen);
  const kolommen = controleerKolommen(invoer.kolommen);

  try {
    const plattegrond = await sequelize.transaction(async (t) => {
      const nieuw = await Plattegrond.create(
        { winkelId, naam, rijen, kolommen },
        { transaction: t },
      );

      await Vak.bulkCreate(
        ontbrekendePosities([], rijen, kolommen).map((plek) => ({
          ...plek,
          plattegrondId: nieuw.id,
        })),
        { transaction: t },
      );

      return nieuw;
    });

    return haal(winkelId, plattegrond.id);
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) throw naamBestaatAl();
    throw fout;
  }
}

/**
 * Naam of afmetingen aanpassen.
 *
 * Vergroten is altijd veilig: er komen lege vakken bij. Verkleinen
 * haalt vakken weg, en als daar nog producten in liggen raken die hun
 * plek kwijt. Dat gebeurt nooit ongemerkt: zonder `losmaken: true`
 * weigert de server, en vertelt hij welke vakken en producten het
 * betreft. Pas als de gebruiker dat gezien heeft en bevestigt, gaat het
 * door. De producten worden losgemaakt, niet verwijderd.
 */
export async function wijzig(winkelId, id, invoer) {
  // Eerst alles controleren, dan pas de database in.
  const naam = invoer.naam === undefined ? undefined : controle.tekst(invoer.naam, "Naam", { max: 120 });
  const rijen = invoer.rijen === undefined ? undefined : controleerRijen(invoer.rijen);
  const kolommen = invoer.kolommen === undefined ? undefined : controleerKolommen(invoer.kolommen);
  const losmaken = invoer.losmaken === true;

  try {
    await sequelize.transaction(async (t) => {
      const plattegrond = await zoek(winkelId, id, t);

      const nieuweRijen = rijen ?? plattegrond.rijen;
      const nieuweKolommen = kolommen ?? plattegrond.kolommen;

      if (nieuweRijen !== plattegrond.rijen || nieuweKolommen !== plattegrond.kolommen) {
        await pasRasterAan(plattegrond, nieuweRijen, nieuweKolommen, losmaken, t);
      }

      if (naam !== undefined) plattegrond.naam = naam;
      plattegrond.rijen = nieuweRijen;
      plattegrond.kolommen = nieuweKolommen;
      await plattegrond.save({ transaction: t });
    });
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) throw naamBestaatAl();
    throw fout;
  }

  return haal(winkelId, id);
}

async function pasRasterAan(plattegrond, rijen, kolommen, losmaken, transaction) {
  const vakken = await Vak.findAll({
    where: { plattegrondId: plattegrond.id },
    transaction,
  });

  const weg = vakken.filter((vak) => valtBuiten(vak, rijen, kolommen));

  if (weg.length > 0) {
    const wegIds = weg.map((vak) => vak.id);

    // Alleen actieve partijen tellen. Een afgemelde partij is
    // geschiedenis; die mag zijn vak kwijtraken zonder dat iemand
    // daarvoor gewaarschuwd hoeft te worden.
    const geraakt = await Partij.findAll({
      where: { vakId: { [Op.in]: wegIds }, status: "ACTIEF" },
      include: [{ model: Product, attributes: ["naam"] }],
      transaction,
    });

    if (geraakt.length > 0 && !losmaken) {
      throw new HttpFout(
        409,
        geraakt.length === 1
          ? "Bij dit verkleinen raakt 1 product zijn plek kwijt."
          : `Bij dit verkleinen raken ${geraakt.length} producten hun plek kwijt.`,
        { geraakt: beschrijfGeraakt(weg, geraakt), aantal: geraakt.length },
      );
    }

    // Losmaken, niet verwijderen. De database zou dit ook zelf doen
    // (ON DELETE SET NULL), maar hier staat het zichtbaar in de code,
    // zodat niemand hoeft te weten hoe de koppeling is ingesteld om te
    // begrijpen wat er gebeurt.
    await Partij.update(
      { vakId: null },
      { where: { vakId: { [Op.in]: wegIds } }, transaction },
    );
    await Vak.destroy({ where: { id: { [Op.in]: wegIds } }, transaction });
  }

  const blijven = vakken.filter((vak) => !valtBuiten(vak, rijen, kolommen));
  const nieuw = ontbrekendePosities(blijven, rijen, kolommen);

  if (nieuw.length > 0) {
    await Vak.bulkCreate(
      nieuw.map((plek) => ({ ...plek, plattegrondId: plattegrond.id })),
      { transaction },
    );
  }
}

/** Per vak dat wegvalt: waar het zit, hoe het heet, wat erin ligt. */
function beschrijfGeraakt(weg, geraakt) {
  return weg
    .map((vak) => ({
      positie: positie(vak.rij, vak.kolom),
      naam: vak.naam,
      producten: geraakt
        .filter((partij) => partij.vakId === vak.id)
        .map((partij) => partij.Product?.naam ?? "Onbekend product"),
    }))
    .filter((vak) => vak.producten.length > 0);
}

/**
 * Een vak een naam geven, of de naam weghalen met een lege waarde.
 * Het vak moet bij een plattegrond van deze winkel horen.
 */
export async function hernoemVak(winkelId, vakId, invoer) {
  const naam = controle.optioneleTekst(invoer.naam, "Naam", { max: 120 });

  const vak = await Vak.findOne({
    where: { id: vakId },
    include: [{ model: Plattegrond, where: { winkelId }, attributes: [] }],
  });
  if (!vak) throw nietGevonden("Dit vak bestaat niet.");

  vak.naam = naam;
  await vak.save();

  return vakNaarBuiten(vak);
}
