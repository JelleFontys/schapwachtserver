import { DataTypes, Model } from "sequelize";

/**
 * Een plattegrond is een raster van vakken, bijvoorbeeld "Winkel" of
 * "Magazijn". De afmetingen zijn instelbaar.
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
      rijen: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,
        validate: { min: { args: [1], msg: "Een raster heeft minstens één rij." } },
      },
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
