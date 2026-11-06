import { DataTypes, Model } from "sequelize";

/**
 * De vloer van een ruimte, van bovenaf gezien, als raster van hokjes.
 * Bijvoorbeeld "Winkel" of "Magazijn". Op de vloer staan stellingen.
 */
export class Plattegrond extends Model {}

export function maakPlattegrond(sequelize) {
  Plattegrond.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      naam: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: { msg: "Een plattegrond moet een naam hebben." } },
      },
      /** Hoogte van de vloer in hokjes. */
      rijen: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,
        validate: { min: { args: [1], msg: "Een raster heeft minstens één rij." } },
      },
      /** Breedte van de vloer in hokjes. */
      kolommen: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,
        validate: { min: { args: [1], msg: "Een raster heeft minstens één kolom." } },
      },
    },
    { sequelize, modelName: "Plattegrond", tableName: "plattegrond" },
  );

  return Plattegrond;
}
