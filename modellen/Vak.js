import { DataTypes, Model } from "sequelize";

/**
 * Eén plek op een plank, waar een product staat. Plek 1 is de meest
 * linkse. Hier hangt een partij aan: dit product, met deze datum,
 * staat hier.
 */
export class Vak extends Model {}

export function maakVak(sequelize) {
  Vak.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      positie: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    },
    { sequelize, modelName: "Vak", tableName: "vak", timestamps: false },
  );

  return Vak;
}
