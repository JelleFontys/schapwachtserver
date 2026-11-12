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

async function koppelingVan(queryInterface, tabel, kolom) {
  const koppelingen = await queryInterface.getForeignKeyReferencesForTable(tabel);
  return koppelingen.find((k) => k.columnName === kolom)?.constraintName;
}

export async function up({ context: queryInterface }) {
  await queryInterface.bulkUpdate("partij", { vak_id: null }, {});
  const oud = await koppelingVan(queryInterface, "partij", "vak_id");
  if (oud) await queryInterface.removeConstraint("partij", oud);
  await queryInterface.dropTable("vak");

  await queryInterface.createTable("stelling", {
    id: idKolom,
    plattegrond_id: verwijzing("plattegrond"),
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
