// Het assortiment: producten met naam, productgroep en barcode (SW-25),
// en opzoeken op barcode na het scannen (SW-37).
//
// Een product heeft geen houdbaarheidsdatum en geen vaste plek. De datum
// hoort bij een partij, en een product kan op meer plekken tegelijk
// liggen. "Waar hoort dit?" beantwoorden we daarom met waar het nu ligt.

import { Op, UniqueConstraintError } from "sequelize";

import { Product, Productgroep, Partij } from "../modellen/index.js";
import { HttpFout, nietGevonden, ongeldig } from "../kern/hulp.js";
import { afprijsDagenVan, statusVan } from "../kern/status.js";
import * as controle from "../kern/controle.js";
import { plekInclude, plekVan } from "./plek.js";

export const naarBuiten = (product) => ({
  id: product.id,
  naam: product.naam,
  barcode: product.barcode,
  productgroep: product.Productgroep
    ? { id: product.Productgroep.id, naam: product.Productgroep.naam }
    : null,
  afprijsDagen: afprijsDagenVan(product),
});

const metGroep = [{ model: Productgroep, attributes: ["id", "naam", "afprijsDagen"] }];

async function zoek(winkelId, id) {
  const product = await Product.findOne({ where: { id, winkelId }, include: metGroep });
  if (!product) throw nietGevonden("Dit product bestaat niet.");
  return product;
}

/** De productgroep moet van dezelfde winkel zijn, of leeg. */
async function controleerGroep(winkelId, productgroepId) {
  if (productgroepId === undefined) return undefined;
  if (productgroepId === null || productgroepId === "") return null;

  const groep = await Productgroep.findOne({ where: { id: productgroepId, winkelId } });
  if (!groep) throw ongeldig("Deze productgroep bestaat niet.");
  return groep.id;
}

async function barcodeBestaatAl(winkelId, barcode) {
  const ander = await Product.findOne({ where: { winkelId, barcode } });
  return new HttpFout(409, `Er is al een product met deze barcode: ${ander?.naam ?? "onbekend"}.`, {
    productId: ander?.id,
  });
}

export async function lijst(winkelId, { zoek: zoekterm } = {}) {
  const term = typeof zoekterm === "string" ? zoekterm.trim() : "";
  const producten = await Product.findAll({
    where: {
      winkelId,
      ...(term
        ? { [Op.or]: [{ naam: { [Op.like]: `%${term}%` } }, { barcode: { [Op.like]: `${term}%` } }] }
        : {}),
    },
    include: metGroep,
    order: [["naam", "ASC"]],
    limit: 500,
  });
  return producten.map(naarBuiten);
}

export async function haal(winkelId, id) {
  return naarBuiten(await zoek(winkelId, id));
}

export async function maak(winkelId, invoer) {
  const gegevens = {
    naam: controle.tekst(invoer.naam, "Naam", { max: 190 }),
    barcode: controle.barcode(invoer.barcode),
    productgroepId: (await controleerGroep(winkelId, invoer.productgroepId ?? null)) ?? null,
  };

  try {
    const product = await Product.create({ winkelId, ...gegevens });
    return haal(winkelId, product.id);
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) throw await barcodeBestaatAl(winkelId, gegevens.barcode);
    throw fout;
  }
}

export async function wijzig(winkelId, id, invoer) {
  const product = await zoek(winkelId, id);
  const gegevens = {};
  if (invoer.naam !== undefined) gegevens.naam = controle.tekst(invoer.naam, "Naam", { max: 190 });
  if (invoer.barcode !== undefined) gegevens.barcode = controle.barcode(invoer.barcode);
  const groep = await controleerGroep(winkelId, invoer.productgroepId);
  if (groep !== undefined) gegevens.productgroepId = groep;

  try {
    await product.update(gegevens);
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) throw await barcodeBestaatAl(winkelId, gegevens.barcode);
    throw fout;
  }
  return haal(winkelId, id);
}

/**
 * Een product weghalen kan alleen als het nog nooit gebruikt is.
 *
 * Met de database-koppeling zou weghalen ook alle partijen van dit
 * product weggooien, ook de afgemelde. Dan verdwijnt er stil
 * geschiedenis uit het overzicht van weggegooide producten (SW-39). Is
 * een product al gebruikt, pas dan liever de naam aan.
 */
export async function verwijder(winkelId, id) {
  const product = await zoek(winkelId, id);
  const gebruikt = await Partij.count({ where: { productId: product.id } });
  if (gebruikt > 0) {
    throw new HttpFout(
      409,
      `Dit product is al ${gebruikt === 1 ? "1 keer" : `${gebruikt} keer`} gebruikt en blijft daarom bewaard. Pas de naam aan als die niet klopt.`,
    );
  }
  await product.destroy();
}

/**
 * Een gescand product opzoeken (SW-37). Geeft het product terug en waar
 * het nu ligt, of `product: null` als de barcode onbekend is. Dat laatste
 * is geen fout: dan maakt de gebruiker het product aan (SW-38).
 */
export async function opBarcode(winkelId, code) {
  const barcode = controle.barcode(code);
  if (!barcode) throw ongeldig("Vul een barcode in.");

  const product = await Product.findOne({ where: { winkelId, barcode }, include: metGroep });
  if (!product) return { barcode, product: null, plekken: [] };

  const partijen = await Partij.findAll({
    where: { productId: product.id, status: "ACTIEF", vakId: { [Op.ne]: null } },
    include: [plekInclude({ verplicht: true, winkelId })],
    order: [["houdbaarTot", "ASC"]],
  });

  // Eén regel per vak, met de vroegste datum die daar ligt.
  const perVak = new Map();
  for (const partij of partijen) {
    if (perVak.has(partij.vakId)) continue;
    perVak.set(partij.vakId, {
      ...plekVan(partij.Vak),
      houdbaarTot: partij.houdbaarTot,
      status: statusVan(partij.houdbaarTot, afprijsDagenVan(product)),
    });
  }

  return { barcode, product: naarBuiten(product), plekken: [...perVak.values()] };
}
