import { DataTypes, Model } from "sequelize";

export class Plank extends Model {}

export function maakPlank(sequelize) {
  Plank.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      nummer: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    },
    { sequelize, modelName: "Plank", tableName: "plank", timestamps: false },
  );

  return Plank;
}
