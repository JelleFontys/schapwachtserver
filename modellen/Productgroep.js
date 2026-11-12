import { DataTypes, Model } from "sequelize";

export class Productgroep extends Model {}

export function maakProductgroep(sequelize) {
  Productgroep.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      naam: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: { msg: "Een productgroep moet een naam hebben." } },
      },
      afprijsDagen: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: false,
        defaultValue: 2,
        field: "afprijs_dagen",
        validate: {
          min: { args: [0], msg: "Het aantal dagen kan niet negatief zijn." },
          max: { args: [365], msg: "Meer dan een jaar vooruit afprijzen klopt niet." },
        },
      },
    },
    { sequelize, modelName: "Productgroep", tableName: "productgroep" },
  );

  return Productgroep;
}
