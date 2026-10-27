// Eerste opzet van de database.
//
// De belangrijkste ontwerpkeuze zit in de tabel `partij`: een
// houdbaarheidsdatum hoort bij een partij en niet bij een product.
// Hetzelfde product kan op twee plekken liggen met verschillende
// datums, en achter in een vak kan nog oude voorraad staan.

import { DataTypes } from "sequelize";

// Deze kolommen komen in bijna elke tabel terug.
const tijdstempels = {
  aangemaakt_op: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  bijgewerkt_op: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
};

const idKolom = { type: DataTypes.UUID, primaryKey: true, allowNull: false };

export async function up({ context: queryInterface }) {
  await queryInterface.createTable("winkel", {
    id: idKolom,
    naam: { type: DataTypes.STRING(120), allowNull: false },
    uitnodigingscode: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    ...tijdstempels,
  });

  await queryInterface.createTable("gebruiker", {
    id: idKolom,
    winkel_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "winkel", key: "id" },
      onDelete: "CASCADE",
    },
    naam: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(190), allowNull: false, unique: true },
    wachtwoord_hash: { type: DataTypes.STRING(255), allowNull: false },
    rol: {
      type: DataTypes.ENUM("MEDEWERKER", "LEIDINGGEVENDE"),
      allowNull: false,
      defaultValue: "MEDEWERKER",
    },
    ...tijdstempels,
  });

  await queryInterface.createTable("plattegrond", {
    id: idKolom,
    winkel_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "winkel", key: "id" },
      onDelete: "CASCADE",
    },
    naam: { type: DataTypes.STRING(120), allowNull: false },
    rijen: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    kolommen: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    ...tijdstempels,
  });

  await queryInterface.createTable("vak", {
    id: idKolom,
    plattegrond_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "plattegrond", key: "id" },
      onDelete: "CASCADE",
    },
    rij: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    kolom: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    naam: { type: DataTypes.STRING(120), allowNull: true },
  });

  await queryInterface.createTable("productgroep", {
    id: idKolom,
    winkel_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "winkel", key: "id" },
      onDelete: "CASCADE",
    },
    naam: { type: DataTypes.STRING(120), allowNull: false },
    afprijs_dagen: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 2,
    },
    ...tijdstempels,
  });

  await queryInterface.createTable("product", {
    id: idKolom,
    winkel_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "winkel", key: "id" },
      onDelete: "CASCADE",
    },
    productgroep_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "productgroep", key: "id" },
      onDelete: "SET NULL",
    },
    naam: { type: DataTypes.STRING(190), allowNull: false },
    barcode: { type: DataTypes.STRING(40), allowNull: true },
    ...tijdstempels,
  });

  await queryInterface.createTable("partij", {
    id: idKolom,
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "product", key: "id" },
      onDelete: "CASCADE",
    },
    // Mag leeg zijn: bij het verkleinen van het raster raakt een partij
    // zijn plek kwijt, maar hij wordt niet verwijderd.
    vak_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "vak", key: "id" },
      onDelete: "SET NULL",
    },
    houdbaar_tot: { type: DataTypes.DATEONLY, allowNull: false },
    // Indicatief, geen voorraadadministratie.
    aantal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: {
      type: DataTypes.ENUM("ACTIEF", "AFGEMELD"),
      allowNull: false,
      defaultValue: "ACTIEF",
    },
    uitkomst: {
      type: DataTypes.ENUM("GESTICKERD", "UITVERKOCHT", "WEGGEGOOID"),
      allowNull: true,
    },
    afgemeld_op: { type: DataTypes.DATE, allowNull: true },
    afgemeld_door_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "gebruiker", key: "id" },
      onDelete: "SET NULL",
    },
    ...tijdstempels,
  });

  // Binnen één winkel mag een barcode maar één keer voorkomen. MySQL
  // staat meerdere NULL-waarden toe in een unieke index, dus producten
  // zonder barcode blijven mogelijk.
  await queryInterface.addConstraint("product", {
    fields: ["winkel_id", "barcode"],
    type: "unique",
    name: "uq_product_barcode",
  });

  await queryInterface.addConstraint("plattegrond", {
    fields: ["winkel_id", "naam"],
    type: "unique",
    name: "uq_plattegrond_naam",
  });

  await queryInterface.addConstraint("productgroep", {
    fields: ["winkel_id", "naam"],
    type: "unique",
    name: "uq_productgroep_naam",
  });

  await queryInterface.addConstraint("vak", {
    fields: ["plattegrond_id", "rij", "kolom"],
    type: "unique",
    name: "uq_vak_positie",
  });

  // De werklijst vraagt actieve partijen op, gesorteerd op datum.
  await queryInterface.addIndex("partij", ["status", "houdbaar_tot"], {
    name: "ix_partij_werklijst",
  });
}

export async function down({ context: queryInterface }) {
  // Omgekeerde volgorde: een tabel kan pas weg als niets ernaar verwijst.
  for (const tabel of [
    "partij",
    "vak",
    "plattegrond",
    "product",
    "productgroep",
    "gebruiker",
    "winkel",
  ]) {
    await queryInterface.dropTable(tabel);
  }
}
