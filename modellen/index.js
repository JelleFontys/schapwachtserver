// Koppelt alle modellen aan de verbinding en legt de relaties vast.
//
// Importeer modellen altijd hiervandaan, niet rechtstreeks uit hun
// eigen bestand: pas hier zijn de relaties gelegd.

import { sequelize } from "../kern/db.js";

import { maakWinkel } from "./Winkel.js";
import { maakGebruiker } from "./Gebruiker.js";
import { maakPlattegrond } from "./Plattegrond.js";
import { maakVak } from "./Vak.js";
import { maakProductgroep } from "./Productgroep.js";
import { maakProduct } from "./Product.js";
import { maakPartij } from "./Partij.js";

export const Winkel = maakWinkel(sequelize);
export const Gebruiker = maakGebruiker(sequelize);
export const Plattegrond = maakPlattegrond(sequelize);
export const Vak = maakVak(sequelize);
export const Productgroep = maakProductgroep(sequelize);
export const Product = maakProduct(sequelize);
export const Partij = maakPartij(sequelize);

// ── Relaties ────────────────────────────────────────────
// Alles hangt aan een winkel. Verdwijnt die, dan verdwijnt de rest mee.

Winkel.hasMany(Gebruiker, { foreignKey: "winkelId", onDelete: "CASCADE" });
Gebruiker.belongsTo(Winkel, { foreignKey: "winkelId" });

Winkel.hasMany(Plattegrond, { foreignKey: "winkelId", onDelete: "CASCADE" });
Plattegrond.belongsTo(Winkel, { foreignKey: "winkelId" });

Winkel.hasMany(Productgroep, { foreignKey: "winkelId", onDelete: "CASCADE" });
Productgroep.belongsTo(Winkel, { foreignKey: "winkelId" });

Winkel.hasMany(Product, { foreignKey: "winkelId", onDelete: "CASCADE" });
Product.belongsTo(Winkel, { foreignKey: "winkelId" });

Plattegrond.hasMany(Vak, { foreignKey: "plattegrondId", onDelete: "CASCADE" });
Vak.belongsTo(Plattegrond, { foreignKey: "plattegrondId" });

// Een productgroep weghalen mag: de producten blijven bestaan en
// vallen dan terug op de standaard afprijsregel.
Productgroep.hasMany(Product, { foreignKey: "productgroepId", onDelete: "SET NULL" });
Product.belongsTo(Productgroep, { foreignKey: "productgroepId" });

Product.hasMany(Partij, { foreignKey: "productId", onDelete: "CASCADE" });
Partij.belongsTo(Product, { foreignKey: "productId" });

// Een vak weghalen mag de partij niet weggooien: die raakt alleen zijn
// plek kwijt en komt in de lijst "zonder locatie".
Vak.hasMany(Partij, { foreignKey: "vakId", onDelete: "SET NULL" });
Partij.belongsTo(Vak, { foreignKey: "vakId" });

Gebruiker.hasMany(Partij, { foreignKey: "afgemeldDoorId", as: "afmeldingen" });
Partij.belongsTo(Gebruiker, { foreignKey: "afgemeldDoorId", as: "afgemeldDoor" });

export { sequelize };
