import { Op, UniqueConstraintError } from "sequelize";

import { Product, Productgroep, Partij } from "../modellen/index.js";
import { HttpFout, nietGevonden, ongeldig } from "../kern/hulp.js";
import { afprijsDagenVan, statusVan } from "../kern/status.js";
import * as controle from "../kern/controle.js";
import { NietBereikbaar, opzoeken } from "../kern/openFoodFacts.js";
import { plekInclude, plekVan } from "./plek.js";

export const naarBuiten = (product) => ({
  id: product.id,
  naam: product.naam,
  barcode: product.barcode,
  bron: product.bron,
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

// Staat deze barcode in de openbare database? Bij een storing daar
// gaat het gewoon door: dan kunnen we het niet controleren.
async function inOpenbareDatabase(barcode) {
  try {
    return await opzoeken(barcode);
  } catch (fout) {
    if (fout instanceof NietBereikbaar) return null;
    throw fout;
  }
}

function hoortBijOpenbaar(barcode, gevonden) {
  return new HttpFout(
    409,
    `Er is al een product met deze barcode in de openbare database: ${gevonden.naam}. Voeg het toe via Scannen.`,
    { openbaar: { barcode, naam: gevonden.naam } },
  );
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
  const openbaar = invoer.uitOpenbareDatabase === true;
  const gegevens = {
    naam: controle.tekst(invoer.naam, "Naam", { max: 190 }),
    barcode: controle.barcode(invoer.barcode),
    productgroepId: (await controleerGroep(winkelId, invoer.productgroepId ?? null)) ?? null,
    bron: openbaar ? "OPEN_FOOD_FACTS" : "EIGEN",
  };

  if (gegevens.barcode && (await Product.findOne({ where: { winkelId, barcode: gegevens.barcode } }))) {
    throw await barcodeBestaatAl(winkelId, gegevens.barcode);
  }

  if (openbaar) {
    if (!gegevens.barcode) throw ongeldig("Een product uit de openbare database heeft een barcode nodig.");
    let gevonden;
    try {
      gevonden = await opzoeken(gegevens.barcode);
    } catch (fout) {
      if (fout instanceof NietBereikbaar) {
        throw new HttpFout(503, "De openbare database is nu niet bereikbaar. Probeer het straks opnieuw.");
      }
      throw fout;
    }
    if (!gevonden) throw ongeldig("Deze barcode staat niet in de openbare database.");
  } else if (gegevens.barcode) {
    const gevonden = await inOpenbareDatabase(gegevens.barcode);
    if (gevonden) throw hoortBijOpenbaar(gegevens.barcode, gevonden);
  }

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
  if (invoer.barcode !== undefined) {
    const barcode = controle.barcode(invoer.barcode);
    if (barcode !== product.barcode) {
      if (product.bron === "OPEN_FOOD_FACTS") {
        throw ongeldig("De barcode van een product uit de openbare database kun je niet wijzigen.");
      }
      if (barcode) {
        const gevonden = await inOpenbareDatabase(barcode);
        if (gevonden) throw hoortBijOpenbaar(barcode, gevonden);
      }
      gegevens.barcode = barcode;
    }
  }
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

export async function opBarcode(winkelId, code) {
  const barcode = controle.barcode(code);
  if (!barcode) throw ongeldig("Vul een barcode in.");

  const product = await Product.findOne({ where: { winkelId, barcode }, include: metGroep });
  if (!product) {
    let openbaar = null;
    let openbaarBereikbaar = true;
    try {
      openbaar = await opzoeken(barcode);
    } catch (fout) {
      if (!(fout instanceof NietBereikbaar)) throw fout;
      openbaarBereikbaar = false;
    }
    return { barcode, product: null, plekken: [], openbaar, openbaarBereikbaar };
  }

  const partijen = await Partij.findAll({
    where: { productId: product.id, status: "ACTIEF", vakId: { [Op.ne]: null } },
    include: [plekInclude({ verplicht: true, winkelId })],
    order: [["houdbaarTot", "ASC"]],
  });

  const perVak = new Map();
  for (const partij of partijen) {
    if (perVak.has(partij.vakId)) continue;
    perVak.set(partij.vakId, {
      ...plekVan(partij.Vak),
      houdbaarTot: partij.houdbaarTot,
      status: statusVan(partij.houdbaarTot, afprijsDagenVan(product)),
    });
  }

  return {
    barcode,
    product: naarBuiten(product),
    plekken: [...perVak.values()],
    openbaar: null,
    openbaarBereikbaar: true,
  };
}
