import { DataTypes, Model } from "sequelize";

export class Gebruiker extends Model {}

export const ROLLEN = ["MEDEWERKER", "LEIDINGGEVENDE"];

export function maakGebruiker(sequelize) {
  Gebruiker.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      naam: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: { msg: "Een gebruiker moet een naam hebben." } },
      },
      email: {
        type: DataTypes.STRING(190),
        allowNull: false,
        unique: true,
        validate: { isEmail: { msg: "Dit is geen geldig e-mailadres." } },
      },
      wachtwoordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "wachtwoord_hash",
      },
      rol: {
        type: DataTypes.ENUM(...ROLLEN),
        allowNull: false,
        defaultValue: "MEDEWERKER",
      },
    },
    {
      sequelize,
      modelName: "Gebruiker",
      tableName: "gebruiker",
      defaultScope: { attributes: { exclude: ["wachtwoordHash"] } },
      scopes: {
        metWachtwoord: { attributes: { include: ["wachtwoordHash"] } },
      },
    },
  );

  return Gebruiker;
}
