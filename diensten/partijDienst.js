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

export async function plaats(winkelId, id, invoer) {
  const partij = await zoekActief(winkelId, id);
  const vak = await zoekVak(winkelId, invoer.vakId);
  await partij.update({ vakId: vak.id });
  return haalPartij(winkelId, partij.id);
}

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

export async function inVakken(winkelId, vakIds) {
  if (vakIds.length === 0) return [];
  return Partij.findAll({
    where: { vakId: { [Op.in]: vakIds }, status: "ACTIEF" },
    include: [productMetGroep(winkelId)],
    order: [["houdbaarTot", "ASC"]],
  });
}

