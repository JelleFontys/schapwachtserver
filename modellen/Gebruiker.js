import { DataTypes, Model } from "sequelize";

/** Een medewerker of leidinggevende. Hoort bij precies één winkel. */
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
      // Het wachtwoord komt standaard niet mee uit de database. Zo kan
      // een hash niet per ongeluk in een API-antwoord belanden. Heb je
      // hem nodig om in te loggen, vraag dan expliciet de scope
      // "metWachtwoord" op.
      defaultScope: { attributes: { exclude: ["wachtwoordHash"] } },
      scopes: {
        metWachtwoord: { attributes: { include: ["wachtwoordHash"] } },
      },
    },
  );

  return Gebruiker;
}
