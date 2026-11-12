import { DataTypes, Model } from "sequelize";

export class Stelling extends Model {}

export function maakStelling(sequelize) {
  Stelling.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      x: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      y: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      breedte: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      hoogte: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    },
    { sequelize, modelName: "Stelling", tableName: "stelling" },
  );

  return Stelling;
}
