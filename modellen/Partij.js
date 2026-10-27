import { DataTypes, Model } from "sequelize";

/**
 * Een partij: dit product, op deze plek, met deze houdbaarheidsdatum.
 *
 * - `vakId` mag leeg zijn. Als het raster kleiner wordt gemaakt, raken
 *   partijen hun plek kwijt maar worden ze niet verwijderd.
 * - `aantal` is indicatief en geen voorraadadministratie: de kassa weet
 *   niet welke partij verkocht is. De medewerker controleert, de app
 *   wijst aan.
 * - Een partij verdwijnt nooit vanzelf van de werklijst: alleen een
 *   mens kan hem afmelden.
 */
export class Partij extends Model {}

export const PARTIJ_STATUSSEN = ["ACTIEF", "AFGEMELD"];
export const AFMELDUITKOMSTEN = ["GESTICKERD", "UITVERKOCHT", "WEGGEGOOID"];

export function maakPartij(sequelize) {
  Partij.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      houdbaarTot: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "houdbaar_tot",
        validate: { isDate: { msg: "Dit is geen geldige datum." } },
      },
      aantal: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        validate: { min: { args: [0], msg: "Een aantal kan niet negatief zijn." } },
      },
      status: {
        type: DataTypes.ENUM(...PARTIJ_STATUSSEN),
        allowNull: false,
        defaultValue: "ACTIEF",
      },
      uitkomst: {
        type: DataTypes.ENUM(...AFMELDUITKOMSTEN),
        allowNull: true,
      },
      afgemeldOp: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "afgemeld_op",
      },
    },
    {
      sequelize,
      modelName: "Partij",
      tableName: "partij",
      validate: {
        // Afgemeld zonder uitkomst, of een uitkomst zonder afgemeld te
        // zijn, betekent dat er iets misging in de afhandeling.
        uitkomstHoortBijAfgemeld() {
          if (this.status === "AFGEMELD" && !this.uitkomst) {
            throw new Error("Een afgemelde partij moet een uitkomst hebben.");
          }
          if (this.status === "ACTIEF" && this.uitkomst) {
            throw new Error("Een actieve partij heeft geen uitkomst.");
          }
        },
      },
    },
  );

  return Partij;
}
