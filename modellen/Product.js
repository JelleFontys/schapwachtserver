import { DataTypes, Model } from "sequelize";

/**
 * Een artikel in het assortiment. Bevat géén houdbaarheidsdatum:
 * die hoort bij een partij.
 */
export class Product extends Model {}

export function maakProduct(sequelize) {
  Product.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      naam: {
        type: DataTypes.STRING(190),
        allowNull: false,
        validate: { notEmpty: { msg: "Een product moet een naam hebben." } },
      },
      barcode: {
        type: DataTypes.STRING(40),
        allowNull: true,
        validate: {
          is: {
            args: /^[0-9]{8,14}$/,
            msg: "Een barcode bestaat uit 8 tot 14 cijfers.",
          },
        },
      },
    },
    { sequelize, modelName: "Product", tableName: "product" },
  );

  return Product;
}
