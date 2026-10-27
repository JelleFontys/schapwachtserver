import { DataTypes, Model } from "sequelize";

/**
 * Een winkel. Alle gegevens hangen hieraan, zodat gebruikers nooit
 * gegevens van een andere winkel kunnen zien.
 */
export class Winkel extends Model {}

export function maakWinkel(sequelize) {
  Winkel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      naam: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: { msg: "Een winkel moet een naam hebben." } },
      },
      uitnodigingscode: {
        type: DataTypes.STRING(40),
        allowNull: false,
        unique: true,
        validate: {
          len: { args: [4, 40], msg: "De uitnodigingscode is te kort." },
        },
      },
    },
    { sequelize, modelName: "Winkel", tableName: "winkel" },
  );

  return Winkel;
}
