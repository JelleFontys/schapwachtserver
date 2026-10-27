import { DataTypes, Model } from "sequelize";

/** Eén vak in een stelling, op een vaste plek in het raster. */
export class Vak extends Model {}

export function maakVak(sequelize) {
  Vak.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      rij: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      kolom: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
      /** Herkenbare naam voor in de winkel, bijvoorbeeld "Stelling B, plank 3". */
      naam: { type: DataTypes.STRING(120), allowNull: true },
    },
    {
      sequelize,
      modelName: "Vak",
      tableName: "vak",
      timestamps: false,
    },
  );

  return Vak;
}
