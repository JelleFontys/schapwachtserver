import { DataTypes, Model } from "sequelize";

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
