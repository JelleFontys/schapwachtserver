import { DataTypes, Model } from "sequelize";

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
