import { sequelize } from "../kern/db.js";

import { maakWinkel } from "./Winkel.js";
import { maakGebruiker } from "./Gebruiker.js";
import { maakPlattegrond } from "./Plattegrond.js";
import { maakStelling } from "./Stelling.js";
import { maakStellingkant } from "./Stellingkant.js";
import { maakPlank } from "./Plank.js";
import { maakVak } from "./Vak.js";
import { maakProductgroep } from "./Productgroep.js";
import { maakProduct } from "./Product.js";
import { maakPartij } from "./Partij.js";

export const Winkel = maakWinkel(sequelize);
export const Gebruiker = maakGebruiker(sequelize);
export const Plattegrond = maakPlattegrond(sequelize);
export const Stelling = maakStelling(sequelize);
export const Stellingkant = maakStellingkant(sequelize);
export const Plank = maakPlank(sequelize);
export const Vak = maakVak(sequelize);
export const Productgroep = maakProductgroep(sequelize);
export const Product = maakProduct(sequelize);
export const Partij = maakPartij(sequelize);

Winkel.hasMany(Gebruiker, { foreignKey: "winkelId", onDelete: "CASCADE" });
Gebruiker.belongsTo(Winkel, { foreignKey: "winkelId" });

Winkel.hasMany(Plattegrond, { foreignKey: "winkelId", onDelete: "CASCADE" });
Plattegrond.belongsTo(Winkel, { foreignKey: "winkelId" });

Winkel.hasMany(Productgroep, { foreignKey: "winkelId", onDelete: "CASCADE" });
Productgroep.belongsTo(Winkel, { foreignKey: "winkelId" });

Winkel.hasMany(Product, { foreignKey: "winkelId", onDelete: "CASCADE" });
Product.belongsTo(Winkel, { foreignKey: "winkelId" });

Plattegrond.hasMany(Stelling, { foreignKey: "plattegrondId", as: "stellingen", onDelete: "CASCADE" });
Stelling.belongsTo(Plattegrond, { foreignKey: "plattegrondId" });

Stelling.hasMany(Stellingkant, { foreignKey: "stellingId", as: "kanten", onDelete: "CASCADE" });
Stellingkant.belongsTo(Stelling, { foreignKey: "stellingId" });

Stellingkant.hasMany(Plank, { foreignKey: "stellingkantId", as: "planken", onDelete: "CASCADE" });
Plank.belongsTo(Stellingkant, { foreignKey: "stellingkantId" });

Plank.hasMany(Vak, { foreignKey: "plankId", as: "vakken", onDelete: "CASCADE" });
Vak.belongsTo(Plank, { foreignKey: "plankId" });

Productgroep.hasMany(Product, { foreignKey: "productgroepId", onDelete: "SET NULL" });
Product.belongsTo(Productgroep, { foreignKey: "productgroepId" });

Product.hasMany(Partij, { foreignKey: "productId", onDelete: "CASCADE" });
Partij.belongsTo(Product, { foreignKey: "productId" });

Vak.hasMany(Partij, { foreignKey: "vakId", onDelete: "SET NULL" });
Partij.belongsTo(Vak, { foreignKey: "vakId" });

Gebruiker.hasMany(Partij, { foreignKey: "afgemeldDoorId", as: "afmeldingen" });
Partij.belongsTo(Gebruiker, { foreignKey: "afgemeldDoorId", as: "afgemeldDoor" });

export { sequelize };
