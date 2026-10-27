// ═════════════════════════════════════════════════════════
//  schapwachtserver — startpunt
//
//  Dit bestand start de server. De app zelf wordt in kern/app.js
//  gebouwd, zodat tests hem kunnen aanroepen zonder dat er een
//  poort opengaat.
//
//    kern/config.js   omgeving, database, toegestane herkomsten
//    kern/db.js       de Sequelize-verbinding
//    kern/hulp.js     id's, fouttypes, kleine hulpfuncties
//    kern/controle.js controle op wat er binnenkomt
//    kern/token.js    inlogtokens maken en lezen
//    kern/pogingen.js mislukte inlogpogingen tellen
//    kern/app.js      zet Express in elkaar
//
//    modellen/        de tabellen en hun relaties
//    middleware/      afscherming van routes
//    diensten/        wat er mag en wat er gebeurt
//
//    routes/health.js   controle of API en database leven
//    routes/auth.js     registreren, inloggen, uitloggen
//    routes/winkel.js   de eigen winkel en haar medewerkers
//
//  Express kijkt routes van boven naar beneden af, dus de volgorde
//  in kern/app.js moet kloppen.
// ═════════════════════════════════════════════════════════

import { maakApp } from "./kern/app.js";
import { PORT, OMGEVING } from "./kern/config.js";

const app = maakApp();

app.listen(PORT, () => {
  console.log(`API luistert op poort ${PORT} (${OMGEVING})`);
});
