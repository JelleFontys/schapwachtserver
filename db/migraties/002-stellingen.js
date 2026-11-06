// Van "raster van vakken" naar "vloer met stellingen".
//
// In 001 was een plattegrond een raster waarin elk hokje een vak was.
// Dat klopte niet met hoe een winkel eruitziet. Nu is de plattegrond
// de vloer van bovenaf, en staat daar een stelling op: een rechthoek
// van hokjes. Een stelling heeft een linker- en een rechterkant, elke
// kant heeft rijen (planken), en elke rij heeft vakken: de plekken
// waar een product staat.
//
//   plattegrond ─< stelling ─< stellingkant ─< plank ─< vak ─< partij
//
// Wat er met bestaande gegevens gebeurt:
// - Plattegronden blijven bestaan. Hun rijen en kolommen zijn nu de
//   afmetingen van de vloer.
// - De oude vakken (hokjes) verdwijnen. Ze hebben geen tegenhanger in
//   het nieuwe model, want een hokje op de vloer is geen plek op een
//   plank.
// - Partijen blijven bestaan, maar zonder vak. Daarmee komen ze in de
//   lijst "zonder locatie" (SW-24) en kan iemand ze opnieuw plaatsen.
//   Er wordt dus geen enkele partij weggegooid.

import { DataTypes } from "sequelize";

const idKolom = { type: DataTypes.UUID, primaryKey: true, allowNull: false };

const tijdstempels = {
  aangemaakt_op: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  bijgewerkt_op: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
};

const verwijzing = (tabel, { leegMag = false, bijVerwijderen = "CASCADE" } = {}) => ({
  type: DataTypes.UUID,
  allowNull: leegMag,
  references: { model: tabel, key: "id" },
  onDelete: bijVerwijderen,
});

/** De naam van de koppeling van een kolom naar een andere tabel. */
async function koppelingVan(queryInterface, tabel, kolom) {
  const koppelingen = await queryInterface.getForeignKeyReferencesForTable(tabel);
  return koppelingen.find((k) => k.columnName === kolom)?.constraintName;
}

export async function up({ context: queryInterface }) {
  // 1. Partijen los van de oude vakken, en die tabel weg.
  await queryInterface.bulkUpdate("partij", { vak_id: null }, {});
  const oud = await koppelingVan(queryInterface, "partij", "vak_id");
  if (oud) await queryInterface.removeConstraint("partij", oud);
  await queryInterface.dropTable("vak");

  // 2. De nieuwe tabellen.
  await queryInterface.createTable("stelling", {
    id: idKolom,
    plattegrond_id: verwijzing("plattegrond"),
    // Linkerbovenhoek, geteld vanaf 1, plus de afmetingen in hokjes.
    x: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    y: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    breedte: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    hoogte: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    ...tijdstempels,
  });

  await queryInterface.createTable("stellingkant", {
    id: idKolom,
    stelling_id: verwijzing("stelling"),
    kant: { type: DataTypes.ENUM("LINKS", "RECHTS"), allowNull: false },
    naam: { type: DataTypes.STRING(120), allowNull: false },
  });

  await queryInterface.createTable("plank", {
    id: idKolom,
    stellingkant_id: verwijzing("stellingkant"),
    // Rij 1 is de bovenste plank.
    nummer: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
  });

  await queryInterface.createTable("vak", {
    id: idKolom,
    plank_id: verwijzing("plank"),
    // Plek 1 is de meest linkse op de plank.
    positie: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
  });

  // Een stellingkant bestaat maar één keer per stelling, een rij maar
  // één keer per kant, een plek maar één keer per rij. Dat staat ook in
  // de code, maar de database is de laatste verdediging als twee
  // verzoeken tegelijk binnenkomen.
  await queryInterface.addConstraint("stellingkant", {
    fields: ["stelling_id", "kant"],
    type: "unique",
    name: "uq_stellingkant",
  });
  await queryInterface.addConstraint("plank", {
    fields: ["stellingkant_id", "nummer"],
    type: "unique",
    name: "uq_plank_nummer",
  });
  await queryInterface.addConstraint("vak", {
    fields: ["plank_id", "positie"],
    type: "unique",
    name: "uq_vak_positie",
  });

  // 3. Partijen weer aan vakken koppelen, nu aan de nieuwe.
  await queryInterface.addConstraint("partij", {
    fields: ["vak_id"],
    type: "foreign key",
    name: "fk_partij_vak",
    references: { table: "vak", field: "id" },
    onDelete: "SET NULL",
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.bulkUpdate("partij", { vak_id: null }, {});
  await queryInterface.removeConstraint("partij", "fk_partij_vak");

  for (const tabel of ["vak", "plank", "stellingkant", "stelling"]) {
    await queryInterface.dropTable(tabel);
  }

  // De oude vak-tabel terug, zoals in 001. De hokjes zelf komen niet
  // terug: die waren uit het raster af te leiden, maar hun namen niet.
  await queryInterface.createTable("vak", {
    id: idKolom,
    plattegrond_id: verwijzing("plattegrond"),
    rij: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    kolom: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    naam: { type: DataTypes.STRING(120), allowNull: true },
  });
  await queryInterface.addConstraint("vak", {
    fields: ["plattegrond_id", "rij", "kolom"],
    type: "unique",
    name: "uq_vak_positie",
  });
  await queryInterface.addConstraint("partij", {
    fields: ["vak_id"],
    type: "foreign key",
    name: "fk_partij_vak",
    references: { table: "vak", field: "id" },
    onDelete: "SET NULL",
  });
}
