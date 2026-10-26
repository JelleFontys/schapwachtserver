// ═════════════════════════════════════════════════════════
//  schapwachtserver — startpunt
//
//  Dit bestand start de server. De app zelf wordt in kern/app.js
//  gebouwd, zodat tests hem kunnen aanroepen zonder dat er een
//  poort opengaat.
//
//    kern/config.js   omgeving, database, toegestane herkomsten
//    kern/db.js       verbindingspool en queryhulpjes
//    kern/hulp.js     validatie en kleine hulpfuncties
//    kern/app.js      zet Express in elkaar
//
//    routes/health.js   controle of API en database leven
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
