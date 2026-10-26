// Testdata voor de demo.
//
// Maakt één winkel met een leidinggevende en een medewerker, een
// plattegrond van 4 bij 6 vakken, productgroepen met hun eigen
// afprijsregel, producten en partijen met datums die alle drie de
// statussen laten zien: ruim houdbaar, bijna afprijzen en over de datum.
//
// De datums staan ten opzichte van vandaag, zodat de demo over een maand
// nog klopt. De seed ruimt eerst op, dus hij kan meerdere keren draaien.

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

import { DATABASE_URL } from "../kern/config.js";
import { nieuwId, overDagen } from "../kern/hulp.js";

async function main() {
  const db = await mysql.createConnection({ uri: DATABASE_URL });

  try {
    // Opruimen in omgekeerde volgorde van de koppelingen.
    for (const tabel of [
      "partij",
      "vak",
      "plattegrond",
      "product",
      "productgroep",
      "gebruiker",
      "winkel",
    ]) {
      await db.query(`DELETE FROM \`${tabel}\``);
    }

    const winkelId = nieuwId();
    await db.execute("INSERT INTO winkel (id, naam, uitnodigingscode) VALUES (?, ?, ?)", [
      winkelId,
      "Parkshop De Vlinderhoeve",
      "DEMO-2026",
    ]);

    const wachtwoordHash = await bcrypt.hash("Demo1234!", 10);
    for (const [naam, email, rol] of [
      ["Sanne Bakker", "sanne@voorbeeld.nl", "LEIDINGGEVENDE"],
      ["Tim de Groot", "tim@voorbeeld.nl", "MEDEWERKER"],
    ]) {
      await db.execute(
        `INSERT INTO gebruiker (id, winkel_id, naam, email, wachtwoord_hash, rol)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nieuwId(), winkelId, naam, email, wachtwoordHash, rol],
      );
    }

    const groepen = {};
    for (const [naam, afprijsDagen] of [
      ["Zuivel", 2],
      ["Brood", 1],
      ["Koelvers", 3],
      ["Houdbaar", 14],
    ]) {
      groepen[naam] = nieuwId();
      await db.execute(
        "INSERT INTO productgroep (id, winkel_id, naam, afprijs_dagen) VALUES (?, ?, ?, ?)",
        [groepen[naam], winkelId, naam, afprijsDagen],
      );
    }

    const plattegrondId = nieuwId();
    const rijen = 4;
    const kolommen = 6;
    await db.execute(
      "INSERT INTO plattegrond (id, winkel_id, naam, rijen, kolommen) VALUES (?, ?, ?, ?, ?)",
      [plattegrondId, winkelId, "Winkel", rijen, kolommen],
    );

    const vakIds = [];
    for (let rij = 1; rij <= rijen; rij++) {
      for (let kolom = 1; kolom <= kolommen; kolom++) {
        const id = nieuwId();
        vakIds.push(id);
        await db.execute(
          "INSERT INTO vak (id, plattegrond_id, rij, kolom, naam) VALUES (?, ?, ?, ?, ?)",
          [
            id,
            plattegrondId,
            rij,
            kolom,
            `Stelling ${String.fromCharCode(64 + rij)}, plank ${kolom}`,
          ],
        );
      }
    }

    const producten = {};
    for (const [naam, barcode, groep] of [
      ["Halfvolle melk 1L", "8710400145301", "Zuivel"],
      ["Volle yoghurt 500g", "8710400145318", "Zuivel"],
      ["Tarwebrood heel", "8710400200017", "Brood"],
      ["Gerookte kipfilet 150g", "8710400311126", "Koelvers"],
      ["Chocoladekoekjes 300g", "8710400455202", "Houdbaar"],
      ["Sinaasappelsap 1L", "8710400499113", "Houdbaar"],
    ]) {
      producten[naam] = nieuwId();
      await db.execute(
        "INSERT INTO product (id, winkel_id, productgroep_id, naam, barcode) VALUES (?, ?, ?, ?, ?)",
        [producten[naam], winkelId, groepen[groep], naam, barcode],
      );
    }

    // product, vak-index, dagen tot de houdbaarheidsdatum, aantal
    const partijen = [
      ["Halfvolle melk 1L", 0, 0, 8],
      ["Halfvolle melk 1L", 0, 6, 12],
      ["Tarwebrood heel", 1, 1, 4],
      ["Gerookte kipfilet 150g", 2, 2, 6],
      ["Volle yoghurt 500g", 3, 9, 10],
      ["Chocoladekoekjes 300g", 7, 40, 24],
      ["Sinaasappelsap 1L", 8, 120, 18],
    ];

    for (const [naam, vakIndex, dagen, aantal] of partijen) {
      await db.execute(
        "INSERT INTO partij (id, product_id, vak_id, houdbaar_tot, aantal) VALUES (?, ?, ?, ?, ?)",
        [nieuwId(), producten[naam], vakIds[vakIndex], overDagen(dagen), aantal],
      );
    }

    // Eén partij zonder locatie, zoals na het verkleinen van het raster.
    await db.execute(
      "INSERT INTO partij (id, product_id, vak_id, houdbaar_tot, aantal) VALUES (?, ?, NULL, ?, ?)",
      [nieuwId(), producten["Chocoladekoekjes 300g"], overDagen(5), 3],
    );

    console.log("Testdata geplaatst:");
    console.log("  winkel       Parkshop De Vlinderhoeve (code DEMO-2026)");
    console.log("  gebruikers   sanne@voorbeeld.nl en tim@voorbeeld.nl, wachtwoord Demo1234!");
    console.log(`  plattegrond  Winkel, ${rijen}x${kolommen} (${vakIds.length} vakken)`);
    console.log(`  partijen     ${partijen.length + 1}, waarvan 1 zonder locatie`);
  } finally {
    await db.end();
  }
}

main().catch((fout) => {
  console.error(fout.message);
  process.exitCode = 1;
});
