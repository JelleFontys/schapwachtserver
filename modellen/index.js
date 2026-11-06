// Koppelt alle modellen aan de verbinding en legt de relaties vast.
//
// Importeer modellen altijd hiervandaan, niet rechtstreeks uit hun
// eigen bestand: pas hier zijn de relaties gelegd.

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

// De vloer en wat erop staat: plattegrond > stelling > kant > rij > vak.
// Weg met de bovenste betekent weg met alles eronder.
Plattegrond.hasMany(Stelling, { foreignKey: "plattegrondId", as: "stellingen", onDelete: "CASCADE" });
Stelling.belongsTo(Plattegrond, { foreignKey: "plattegrondId" });

Stelling.hasMany(Stellingkant, { foreignKey: "stellingId", as: "kanten", onDelete: "CASCADE" });
Stellingkant.belongsTo(Stelling, { foreignKey: "stellingId" });

Stellingkant.hasMany(Plank, { foreignKey: "stellingkantId", as: "planken", onDelete: "CASCADE" });
Plank.belongsTo(Stellingkant, { foreignKey: "stellingkantId" });

Plank.hasMany(Vak, { foreignKey: "plankId", as: "vakken", onDelete: "CASCADE" });
Vak.belongsTo(Plank, { foreignKey: "plankId" });

// Een productgroep weghalen mag: de producten blijven bestaan en
// vallen dan terug op de standaard afprijsregel.
Productgroep.hasMany(Product, { foreignKey: "productgroepId", onDelete: "SET NULL" });
Product.belongsTo(Productgroep, { foreignKey: "productgroepId" });

Product.hasMany(Partij, { foreignKey: "productId", onDelete: "CASCADE" });
Partij.belongsTo(Product, { foreignKey: "productId" });

// Een vak weghalen mag de partij niet weggooien: die raakt alleen zijn
// plek kwijt en komt in de lijst "zonder locatie". Dat geldt ook als
// er een hele stelling verdwijnt.
Vak.hasMany(Partij, { foreignKey: "vakId", onDelete: "SET NULL" });
Partij.belongsTo(Vak, { foreignKey: "vakId" });

Gebruiker.hasMany(Partij, { foreignKey: "afgemeldDoorId", as: "afmeldingen" });
Partij.belongsTo(Gebruiker, { foreignKey: "afgemeldDoorId", as: "afgemeldDoor" });

export { sequelize };
