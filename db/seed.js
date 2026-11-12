import bcrypt from "bcryptjs";

import { OMGEVING } from "../kern/config.js";
import { overDagen } from "../kern/hulp.js";
import {
  sequelize,
  Winkel,
  Gebruiker,
  Plattegrond,
  Stelling,
  Stellingkant,
  Plank,
  Vak,
  Productgroep,
  Product,
  Partij,
} from "../modellen/index.js";

async function maakStelling(plattegrondId, vlak, kanten, transaction) {
  const stelling = await Stelling.create({ plattegrondId, ...vlak }, { transaction });
  const vakken = {};

  for (const [kant, { naam, rijen }] of Object.entries(kanten)) {
    const nieuweKant = await Stellingkant.create(
      { stellingId: stelling.id, kant, naam },
      { transaction },
    );
    vakken[naam] = [];

    for (const [i, aantal] of rijen.entries()) {
      const plank = await Plank.create(
        { stellingkantId: nieuweKant.id, nummer: i + 1 },
        { transaction },
      );
      const nieuweVakken = await Vak.bulkCreate(
        Array.from({ length: aantal }, (_, p) => ({ plankId: plank.id, positie: p + 1 })),
        { transaction },
      );
      vakken[naam].push(nieuweVakken.map((vak) => vak.id));
    }
  }

  return vakken;
}

async function main() {
  if (OMGEVING === "production") {
    throw new Error("De seed mag niet in productie draaien, die gooit alle data weg.");
  }

  await sequelize.transaction(async (t) => {
    for (const model of [
      Partij,
      Vak,
      Plank,
      Stellingkant,
      Stelling,
      Plattegrond,
      Product,
      Productgroep,
      Gebruiker,
      Winkel,
    ]) {
      await model.destroy({ where: {}, transaction: t });
    }

    const winkel = await Winkel.create(
      { naam: "Parkshop De Vlinderhoeve", uitnodigingscode: "DEMO-2026" },
      { transaction: t },
    );

    const wachtwoordHash = await bcrypt.hash("Demo1234!", 10);
    await Gebruiker.bulkCreate(
      [
        {
          winkelId: winkel.id,
          naam: "Sanne Bakker",
          email: "sanne@voorbeeld.nl",
          rol: "LEIDINGGEVENDE",
          wachtwoordHash,
        },
        {
          winkelId: winkel.id,
          naam: "Tim de Groot",
          email: "tim@voorbeeld.nl",
          rol: "MEDEWERKER",
          wachtwoordHash,
        },
      ],
      { transaction: t, validate: true },
    );

    const groepen = new Map();
    for (const [naam, afprijsDagen] of [
      ["Zuivel", 2],
      ["Brood", 1],
      ["Koelvers", 3],
      ["Houdbaar", 14],
    ]) {
      const groep = await Productgroep.create(
        { winkelId: winkel.id, naam, afprijsDagen },
        { transaction: t },
      );
      groepen.set(naam, groep.id);
    }

    const plattegrond = await Plattegrond.create(
      { winkelId: winkel.id, naam: "Winkel", rijen: 20, kolommen: 10 },
      { transaction: t },
    );

    const vakken = {
      ...(await maakStelling(
        plattegrond.id,
        { x: 2, y: 3, breedte: 2, hoogte: 8 },
        {
          LINKS: { naam: "Koek en snoep", rijen: [6, 6, 6, 4] },
          RECHTS: { naam: "Chips", rijen: [5, 5, 5] },
        },
        t,
      )),
      ...(await maakStelling(
        plattegrond.id,
        { x: 6, y: 3, breedte: 2, hoogte: 8 },
        {
          LINKS: { naam: "Zuivel en vleeswaren", rijen: [4, 4, 4] },
          RECHTS: { naam: "Brood", rijen: [3, 3] },
        },
        t,
      )),
      // Tegen de muur: maar één kant.
      ...(await maakStelling(
        plattegrond.id,
        { x: 1, y: 18, breedte: 8, hoogte: 1 },
        { LINKS: { naam: "Dranken", rijen: [8, 8, 8, 8] } },
        t,
      )),
    };

    const producten = new Map();
    for (const [naam, barcode, groep] of [
      ["Halfvolle melk 1L", "8710400145301", "Zuivel"],
      ["Volle yoghurt 500g", "8710400145318", "Zuivel"],
      ["Tarwebrood heel", "8710400200017", "Brood"],
      ["Gerookte kipfilet 150g", "8710400311126", "Koelvers"],
      ["Chocoladekoekjes 300g", "8710400455202", "Houdbaar"],
      ["Sinaasappelsap 1L", "8710400499114", "Houdbaar"],
    ]) {
      const product = await Product.create(
        { winkelId: winkel.id, productgroepId: groepen.get(groep), naam, barcode },
        { transaction: t },
      );
      producten.set(naam, product.id);
    }

    const plek = (kant, rij, vak) => vakken[kant][rij - 1][vak - 1];
    const partijen = [
      ["Halfvolle melk 1L", plek("Zuivel en vleeswaren", 1, 1), -1, 8],
      ["Halfvolle melk 1L", plek("Zuivel en vleeswaren", 1, 1), 6, 12],
      ["Volle yoghurt 500g", plek("Zuivel en vleeswaren", 2, 1), 9, 10],
      ["Gerookte kipfilet 150g", plek("Zuivel en vleeswaren", 3, 2), 2, 6],
      ["Tarwebrood heel", plek("Brood", 1, 1), 1, 4],
      ["Chocoladekoekjes 300g", plek("Koek en snoep", 2, 3), 40, 24],
      ["Sinaasappelsap 1L", plek("Dranken", 1, 2), 120, 18],
      ["Chocoladekoekjes 300g", null, 5, 3],
    ].map(([naam, vakId, dagen, aantal]) => ({
      productId: producten.get(naam),
      vakId,
      houdbaarTot: overDagen(dagen),
      aantal,
    }));

    await Partij.bulkCreate(partijen, { transaction: t, validate: true });

    console.log("Testdata geplaatst:");
    console.log("  winkel       Parkshop De Vlinderhoeve (code DEMO-2026)");
    console.log("  gebruikers   sanne@voorbeeld.nl en tim@voorbeeld.nl, wachtwoord Demo1234!");
    console.log("  plattegrond  Winkel, 10x20, met 3 stellingen");
    console.log(`  partijen     ${partijen.length}, waarvan 1 zonder plek`);
  });

  await sequelize.close();
}

main().catch((fout) => {
  console.error(fout.message);
  process.exitCode = 1;
});
