// Partijen: dit product, met deze datum, op deze plek.
//
// - Een partij in een vak zetten (SW-26)
// - Afmelden: gestickerd, uitverkocht of weggegooid (SW-28, SW-35)
// - Een heel vak in één keer leegmelden (SW-29)
// - Een partij zonder plek opnieuw plaatsen (SW-24)
// - De werklijst: alles wat actief is, kortst houdbaar bovenaan (SW-34)
//
// Een partij verdwijnt nooit vanzelf. De kassa weet niet welke partij er
// verkocht is, dus alleen een mens kan zeggen dat hij weg is. Daarom
// bestaat er geen code die een partij automatisch afmeldt, ook niet als
// hij al weken over de datum is.

import { Op } from "sequelize";

import { sequelize, Partij, Product, Productgroep } from "../modellen/index.js";
import { nietGevonden } from "../kern/hulp.js";
import { afprijsDagenVan, statusVan } from "../kern/status.js";
import { AFMELDUITKOMSTEN } from "../modellen/Partij.js";
import * as controle from "../kern/controle.js";
import { plekInclude, plekVan, zoekVak } from "./plek.js";
import { naarBuiten as productNaarBuiten } from "./productDienst.js";

const MAX_AANTAL = 9999;

export function naarBuiten(partij) {
  return {
    id: partij.id,
    product: productNaarBuiten(partij.Product),
    houdbaarTot: partij.houdbaarTot,
    aantal: partij.aantal,
    status: statusVan(partij.houdbaarTot, afprijsDagenVan(partij.Product)),
    plek: partij.Vak !== undefined ? plekVan(partij.Vak) : undefined,
  };
}

const productMetGroep = (winkelId) => ({
  model: Product,
  required: true,
  where: { winkelId },
  include: [{ model: Productgroep, attributes: ["id", "naam", "afprijsDagen"] }],
});

/** Een actieve partij van deze winkel, of 404. */
async function zoekActief(winkelId, id, transaction) {
  const partij = await Partij.findOne({
    where: { id, status: "ACTIEF" },
    include: [productMetGroep(winkelId), plekInclude()],
    transaction,
  });
  if (!partij) throw nietGevonden("Deze partij bestaat niet of is al afgemeld.");
  return partij;
}

async function haalPartij(winkelId, id) {
  const partij = await Partij.findOne({
    where: { id },
    include: [productMetGroep(winkelId), plekInclude()],
  });
  return naarBuiten(partij);
}

/**
 * Een product met een houdbaarheidsdatum in een vak zetten.
 *
 * Een datum in het verleden mag: soms ligt er echt iets over de datum
 * in het schap, en dan moet het juist in de app komen zodat het rood
 * wordt. De waarschuwing daarvoor zit in de app, niet hier.
 */
export async function voegToe(winkelId, invoer) {
  const houdbaarTot = controle.datum(invoer.houdbaarTot, "Houdbaarheidsdatum");
  const aantal =
    invoer.aantal === undefined || invoer.aantal === null || invoer.aantal === ""
      ? null
      : controle.geheelGetal(invoer.aantal, "Aantal", { min: 1, max: MAX_AANTAL });

  const vak = await zoekVak(winkelId, invoer.vakId);
  const product = await Product.findOne({ where: { id: invoer.productId ?? null, winkelId } });
  if (!product) throw nietGevonden("Dit product bestaat niet.");

  const partij = await Partij.create({
    productId: product.id,
    vakId: vak.id,
    houdbaarTot,
    aantal,
  });
  return haalPartij(winkelId, partij.id);
}

/** Eén partij afmelden. Wie en wanneer wordt bewaard. */
export async function afmelden(winkelId, gebruikerId, id, invoer) {
  const uitkomst = controle.keuze(invoer.uitkomst, "Uitkomst", AFMELDUITKOMSTEN);
  const partij = await zoekActief(winkelId, id);

  await partij.update({
    status: "AFGEMELD",
    uitkomst,
    afgemeldOp: new Date(),
    afgemeldDoorId: gebruikerId,
  });
  return { id: partij.id, uitkomst };
}

/**
 * Alle actieve partijen in een vak in één keer afmelden, met dezelfde
 * uitkomst. Handig als een vak leeg is: dan is "uitverkocht" voor alles
 * waar.
 */
export async function leegmelden(winkelId, gebruikerId, vakId, invoer) {
  const uitkomst = controle.keuze(invoer.uitkomst, "Uitkomst", AFMELDUITKOMSTEN);

  return sequelize.transaction(async (t) => {
    const vak = await zoekVak(winkelId, vakId, t);
    const [aantal] = await Partij.update(
      { status: "AFGEMELD", uitkomst, afgemeldOp: new Date(), afgemeldDoorId: gebruikerId },
      { where: { vakId: vak.id, status: "ACTIEF" }, transaction: t },
    );
    return { vakId: vak.id, afgemeld: aantal, uitkomst };
  });
}

/** Een partij (opnieuw) op een plek zetten (SW-24). */
export async function plaats(winkelId, id, invoer) {
  const partij = await zoekActief(winkelId, id);
  const vak = await zoekVak(winkelId, invoer.vakId);
  await partij.update({ vakId: vak.id });
  return haalPartij(winkelId, partij.id);
}

/**
 * Alle actieve partijen van de winkel, kortst houdbaar bovenaan (SW-34).
 * Partijen zonder plek staan er ook in, met `plek: null`; de app toont
 * die apart als lijst "zonder plek" (SW-24).
 */
export async function werklijst(winkelId) {
  const partijen = await Partij.findAll({
    where: { status: "ACTIEF" },
    include: [productMetGroep(winkelId), plekInclude()],
    order: [
      ["houdbaarTot", "ASC"],
      [Product, "naam", "ASC"],
    ],
  });
  return partijen.map(naarBuiten);
}

/** Alle actieve partijen in een rij vakken, voor het openklappen van een stelling. */
export async function inVakken(winkelId, vakIds) {
  if (vakIds.length === 0) return [];
  return Partij.findAll({
    where: { vakId: { [Op.in]: vakIds }, status: "ACTIEF" },
    include: [productMetGroep(winkelId)],
    order: [["houdbaarTot", "ASC"]],
  });
}

