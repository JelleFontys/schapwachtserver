import { maakApp } from "./kern/app.js";
import { PORT, OMGEVING } from "./kern/config.js";

const app = maakApp();

app.listen(PORT, () => {
  console.log(`API luistert op poort ${PORT} (${OMGEVING})`);
});
