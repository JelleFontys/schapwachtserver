// Zet Express in elkaar, maar start hem niet.
//
// Door het starten in server.js te houden, kunnen tests deze app
// rechtstreeks aanroepen met supertest zonder dat er een poort opengaat.

import express from "express";
import cors from "cors";
import helmet from "helmet";

import { HERKOMSTEN, OMGEVING } from "./config.js";
import healthRoutes from "../routes/health.js";

export function maakApp() {
  const app = express();

  // Achter de reverse proxy van Dokploy: vertrouw de X-Forwarded-headers,
  // anders ziet Express elk verzoek als afkomstig van de proxy zelf.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin(herkomst, terug) {
        // Verzoeken zonder herkomst (curl, health checks) toestaan.
        if (!herkomst) return terug(null, true);
        terug(null, HERKOMSTEN.includes(herkomst));
      },
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use("/api/health", healthRoutes);

  // Route bestaat niet.
  app.use((req, res) => {
    res.status(404).json({
      fout: `Geen route gevonden voor ${req.method} ${req.originalUrl}`,
    });
  });

  // Eén plek waar alle fouten eindigen. Express herkent een
  // foutafhandelaar aan het aantal parameters, dus deze moet er vier
  // hebben. Details van een onverwachte fout gaan nooit naar de gebruiker.
  app.use((fout, req, res, _next) => {
    if (fout.status) {
      return res.status(fout.status).json({ fout: fout.message });
    }

    console.error("Onverwachte fout:", fout);
    res.status(500).json({
      fout: "Er ging iets mis op de server",
      ...(OMGEVING === "development" ? { details: fout.message } : {}),
    });
  });

  return app;
}
