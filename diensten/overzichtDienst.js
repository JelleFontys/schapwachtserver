import { Op } from "sequelize";

import { Partij, Product, Productgroep } from "../modellen/index.js";
import { ongeldig } from "../kern/hulp.js";
import { datumVan, dagenTussen, vandaag, verschuif } from "../kern/status.js";
import * as controle from "../kern/controle.js";
import { beoordeel } from "../kern/aandacht.js";

const STANDAARD_PERIODE = 30;
const MAX_PERIODE = 366;

export function periode(invoer = {}, opDatum = vandaag()) {
  const tot = invoer.tot ? controle.datum(invoer.tot, "Tot") : opDatum;
  const van = invoer.van
    ? controle.datum(invoer.van, "Van")
    : verschuif(tot, -(STANDAARD_PERIODE - 1));

  if (dagenTussen(van, tot) < 0) throw ongeldig("'Van' moet voor 'tot' liggen.");
  if (dagenTussen(van, tot) >= MAX_PERIODE) throw ongeldig("Kies een periode van maximaal een jaar.");
  return { van, tot };
}

export async function weggegooid(winkelId, invoer) {
  const { van, tot } = periode(invoer);

  const partijen = await Partij.findAll({
    where: {
      status: "AFGEMELD",
      uitkomst: "WEGGEGOOID",
      afgemeldOp: {
        [Op.gte]: new Date(`${verschuif(van, -1)}T00:00:00Z`),
        [Op.lt]: new Date(`${verschuif(tot, 2)}T00:00:00Z`),
      },
    },
    include: [
      {
        model: Product,
        required: true,
        where: { winkelId },
        attributes: ["id", "naam"],
        include: [{ model: Productgroep, attributes: ["id", "naam"] }],
      },
    ],
  });

  const groepen = new Map();
  for (const partij of partijen) {
    const dag = datumVan(partij.afgemeldOp);
    if (dag < van || dag > tot) continue;

    const groep = partij.Product.Productgroep;
    const sleutel = groep?.id ?? "geen";
    if (!groepen.has(sleutel)) {
      groepen.set(sleutel, {
        productgroep: groep ? { id: groep.id, naam: groep.naam } : null,
        partijen: 0,
        stuks: 0,
        zonderAantal: 0,
        producten: new Map(),
      });
    }

    const rij = groepen.get(sleutel);
    rij.partijen += 1;
    if (partij.aantal === null) rij.zonderAantal += 1;
    else rij.stuks += partij.aantal;
    rij.producten.set(partij.Product.naam, (rij.producten.get(partij.Product.naam) ?? 0) + 1);
  }

  const rijen = [...groepen.values()]
    .map((rij) => ({
      ...rij,
      producten: [...rij.producten.entries()]
        .map(([naam, aantal]) => ({ naam, partijen: aantal }))
        .sort((a, b) => b.partijen - a.partijen || a.naam.localeCompare(b.naam)),
    }))
    .sort((a, b) => b.partijen - a.partijen);

  return {
    van,
    tot,
    totaal: {
      partijen: rijen.reduce((som, r) => som + r.partijen, 0),
      stuks: rijen.reduce((som, r) => som + r.stuks, 0),
      zonderAantal: rijen.reduce((som, r) => som + r.zonderAantal, 0),
    },
    groepen: rijen,
  };
}

async function afgemeldIn(winkelId, van, tot) {
  const partijen = await Partij.findAll({
    where: {
      status: "AFGEMELD",
      afgemeldOp: {
        [Op.gte]: new Date(`${verschuif(van, -1)}T00:00:00Z`),
        [Op.lt]: new Date(`${verschuif(tot, 2)}T00:00:00Z`),
      },
    },
    include: [
      {
        model: Product,
        required: true,
        where: { winkelId },
        attributes: ["id", "naam"],
        include: [{ model: Productgroep, attributes: ["id", "naam", "afprijsDagen"] }],
      },
    ],
  });
  return partijen.filter((p) => {
    const dag = datumVan(p.afgemeldOp);
    return dag >= van && dag <= tot;
  });
}

// Per product: hoe vaak weggegooid, uitverkocht en gestickerd, en of
// het aandacht verdient (kern/aandacht.js).
export async function aandachtPerProduct(winkelId, van, tot) {
  const perProduct = new Map();
  for (const partij of await afgemeldIn(winkelId, van, tot)) {
    const product = partij.Product;
    if (!perProduct.has(product.id)) {
      perProduct.set(product.id, {
        product: {
          id: product.id,
          naam: product.naam,
          productgroep: product.Productgroep
            ? { id: product.Productgroep.id, naam: product.Productgroep.naam, afprijsDagen: product.Productgroep.afprijsDagen }
            : null,
        },
        weggegooid: 0,
        uitverkocht: 0,
        gestickerd: 0,
        stuksWeggegooid: 0,
      });
    }
    const rij = perProduct.get(product.id);
    if (partij.uitkomst === "WEGGEGOOID") {
      rij.weggegooid += 1;
      rij.stuksWeggegooid += partij.aantal ?? 0;
    }
    if (partij.uitkomst === "UITVERKOCHT") rij.uitverkocht += 1;
    if (partij.uitkomst === "GESTICKERD") rij.gestickerd += 1;
  }

  const uitkomst = new Map();
  for (const [id, rij] of perProduct) {
    const oordeel = beoordeel(rij);
    if (oordeel) uitkomst.set(id, { ...rij, ...oordeel });
  }
  return uitkomst;
}

export async function aandacht(winkelId, invoer) {
  const { van, tot } = periode(invoer);
  const producten = [...(await aandachtPerProduct(winkelId, van, tot)).values()].sort(
    (a, b) => b.aandeel - a.aandeel || b.weggegooid - a.weggegooid || a.product.naam.localeCompare(b.product.naam),
  );
  return { van, tot, producten };
}
