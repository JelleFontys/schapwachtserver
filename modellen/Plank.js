import { DataTypes, Model } from "sequelize";

/** Eén rij (plank) aan een kant van een stelling. Rij 1 is de bovenste. */
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
