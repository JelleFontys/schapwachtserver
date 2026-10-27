// Testdata voor de demo.
//
// Maakt één winkel met een leidinggevende en een medewerker, een
// plattegrond van 4 bij 6 vakken, productgroepen met hun eigen
// afprijsregel, producten en partijen met datums die alle drie de
// statussen laten zien: ruim houdbaar, bijna afprijzen en over de datum.
//
// De datums staan ten opzichte van vandaag, zodat de demo over een maand
// nog klopt. De seed ruimt eerst op, dus hij kan meerdere keren draaien.

import bcrypt from "bcryptjs";

import { OMGEVING } from "../kern/config.js";
import { overDagen } from "../kern/hulp.js";
import {
  sequelize,
  Winkel,
  Gebruiker,
  Plattegrond,
  Vak,
  Productgroep,
  Product,
  Partij,
} from "../modellen/index.js";

async function main() {
  if (OMGEVING === "production") {
    throw new Error("De seed mag niet in productie draaien, die gooit alle data weg.");
  }

  // Alles gebeurt in één transactie: gaat er halverwege iets mis, dan
  // blijft de database niet half leeggehaald achter.
  await sequelize.transaction(async (t) => {
    // Opruimen in omgekeerde volgorde van de koppelingen.
    for (const model of [Partij, Vak, Plattegrond, Product, Productgroep, Gebruiker, Winkel]) {
      await model.destroy({ where: {}, transaction: t });
    }

    const winkel = await Winkel.create(
      { naam: "Parkshop De Vlinderhoeve", uitnodigingscode: "DEMO-2026" },
      { transaction: t },
    );

    // Eén keer hashen voor beide gebruikers: dit is demodata, geen
    // echte accounts.
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

    const rijen = 4;
    const kolommen = 6;
    const plattegrond = await Plattegrond.create(
      { winkelId: winkel.id, naam: "Winkel", rijen, kolommen },
      { transaction: t },
    );

    const vakken = [];
    for (let rij = 1; rij <= rijen; rij++) {
      for (let kolom = 1; kolom <= kolommen; kolom++) {
        vakken.push({
          plattegrondId: plattegrond.id,
          rij,
          kolom,
          naam: `Stelling ${String.fromCharCode(64 + rij)}, plank ${kolom}`,
        });
      }
    }
    const vakIds = (
      await Vak.bulkCreate(vakken, { transaction: t, validate: true })
    ).map((vak) => vak.id);

    const producten = new Map();
    for (const [naam, barcode, groep] of [
      ["Halfvolle melk 1L", "8710400145301", "Zuivel"],
      ["Volle yoghurt 500g", "8710400145318", "Zuivel"],
      ["Tarwebrood heel", "8710400200017", "Brood"],
      ["Gerookte kipfilet 150g", "8710400311126", "Koelvers"],
      ["Chocoladekoekjes 300g", "8710400455202", "Houdbaar"],
      ["Sinaasappelsap 1L", "8710400499113", "Houdbaar"],
    ]) {
      const product = await Product.create(
        { winkelId: winkel.id, productgroepId: groepen.get(groep), naam, barcode },
        { transaction: t },
      );
      producten.set(naam, product.id);
    }

    // product, vak-index, dagen tot de houdbaarheidsdatum, aantal.
    // Twee partijen melk in hetzelfde vak met verschillende datums: dat
    // is precies het geval waar dit systeem om gebouwd is.
    const partijen = [
      ["Halfvolle melk 1L", 0, 0, 8],
      ["Halfvolle melk 1L", 0, 6, 12],
      ["Tarwebrood heel", 1, 1, 4],
      ["Gerookte kipfilet 150g", 2, 2, 6],
      ["Volle yoghurt 500g", 3, 9, 10],
      ["Chocoladekoekjes 300g", 7, 40, 24],
      ["Sinaasappelsap 1L", 8, 120, 18],
    ].map(([naam, vakIndex, dagen, aantal]) => ({
      productId: producten.get(naam),
      vakId: vakIds[vakIndex],
      houdbaarTot: overDagen(dagen),
      aantal,
    }));

    // Eén partij zonder locatie, zoals na het verkleinen van het raster.
    partijen.push({
      productId: producten.get("Chocoladekoekjes 300g"),
      vakId: null,
      houdbaarTot: overDagen(5),
      aantal: 3,
    });

    await Partij.bulkCreate(partijen, { transaction: t, validate: true });

    console.log("Testdata geplaatst:");
    console.log("  winkel       Parkshop De Vlinderhoeve (code DEMO-2026)");
    console.log("  gebruikers   sanne@voorbeeld.nl en tim@voorbeeld.nl, wachtwoord Demo1234!");
    console.log(`  plattegrond  Winkel, ${rijen}x${kolommen} (${vakIds.length} vakken)`);
    console.log(`  partijen     ${partijen.length}, waarvan 1 zonder locatie`);
  });

  await sequelize.close();
}

main().catch((fout) => {
  console.error(fout.message);
  process.exitCode = 1;
});
