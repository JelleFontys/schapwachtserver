import { DataTypes, Model } from "sequelize";

export class Stellingkant extends Model {}

export const KANTEN = ["LINKS", "RECHTS"];

export function maakStellingkant(sequelize) {
  Stellingkant.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      kant: { type: DataTypes.ENUM(...KANTEN), allowNull: false },
      naam: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: { msg: "Een kant van een stelling moet een naam hebben." } },
      },
    },
    { sequelize, modelName: "Stellingkant", tableName: "stellingkant", timestamps: false },
  );

  return Stellingkant;
}
