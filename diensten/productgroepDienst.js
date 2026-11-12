import { UniqueConstraintError, fn, col } from "sequelize";

import { Productgroep, Product } from "../modellen/index.js";
import { HttpFout, nietGevonden } from "../kern/hulp.js";
import { STANDAARD_AFPRIJS_DAGEN } from "../kern/status.js";
import * as controle from "../kern/controle.js";

const naarBuiten = (groep, aantalProducten = undefined) => ({
  id: groep.id,
  naam: groep.naam,
  afprijsDagen: groep.afprijsDagen,
  ...(aantalProducten === undefined ? {} : { aantalProducten }),
});

const naamBestaatAl = () => new HttpFout(409, "Er is al een productgroep met deze naam.");

function controleer(invoer, { alles }) {
  const uit = {};
  if (alles || invoer.naam !== undefined) uit.naam = controle.tekst(invoer.naam, "Naam", { max: 120 });
  if (alles || invoer.afprijsDagen !== undefined) {
    uit.afprijsDagen = controle.geheelGetal(invoer.afprijsDagen ?? STANDAARD_AFPRIJS_DAGEN, "Afprijsregel", {
      min: 0,
      max: 365,
    });
  }
  return uit;
}

async function zoek(winkelId, id) {
  const groep = await Productgroep.findOne({ where: { id, winkelId } });
  if (!groep) throw nietGevonden("Deze productgroep bestaat niet.");
  return groep;
}

export async function lijst(winkelId) {
  const groepen = await Productgroep.findAll({
    where: { winkelId },
    order: [["naam", "ASC"]],
  });
  const tellingen = await Product.findAll({
    where: { winkelId },
    attributes: ["productgroepId", [fn("COUNT", col("id")), "aantal"]],
    group: ["productgroepId"],
    raw: true,
  });
  const perGroep = new Map(tellingen.map((t) => [t.productgroepId, Number(t.aantal)]));

  return {
    standaardAfprijsDagen: STANDAARD_AFPRIJS_DAGEN,
    groepen: groepen.map((g) => naarBuiten(g, perGroep.get(g.id) ?? 0)),
  };
}

export async function maak(winkelId, invoer) {
  try {
    const groep = await Productgroep.create({ winkelId, ...controleer(invoer, { alles: true }) });
    return naarBuiten(groep, 0);
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) throw naamBestaatAl();
    throw fout;
  }
}

export async function wijzig(winkelId, id, invoer) {
  const groep = await zoek(winkelId, id);
  try {
    await groep.update(controleer(invoer, { alles: false }));
  } catch (fout) {
    if (fout instanceof UniqueConstraintError) throw naamBestaatAl();
    throw fout;
  }
  return naarBuiten(groep);
}

export async function verwijder(winkelId, id) {
  const groep = await zoek(winkelId, id);
  await groep.destroy();
}
