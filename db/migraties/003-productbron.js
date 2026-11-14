import { DataTypes } from "sequelize";

// Waar een product vandaan komt: zelf toegevoegd of uit Open Food Facts.
export async function up({ context: queryInterface }) {
  await queryInterface.addColumn("product", "bron", {
    type: DataTypes.ENUM("EIGEN", "OPEN_FOOD_FACTS"),
    allowNull: false,
    defaultValue: "EIGEN",
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn("product", "bron");
}
