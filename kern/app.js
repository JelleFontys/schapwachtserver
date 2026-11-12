import express from "express";
import cors from "cors";
import helmet from "helmet";

import { HERKOMSTEN, OMGEVING } from "./config.js";
import healthRoutes from "../routes/health.js";
import authRoutes from "../routes/auth.js";
import winkelRoutes from "../routes/winkel.js";
import plattegrondRoutes from "../routes/plattegronden.js";
import stellingRoutes from "../routes/stellingen.js";
import productRoutes from "../routes/producten.js";
import productgroepRoutes from "../routes/productgroepen.js";
import partijRoutes from "../routes/partijen.js";
import vakRoutes from "../routes/vakken.js";
import werklijstRoutes from "../routes/werklijst.js";
import overzichtRoutes from "../routes/overzicht.js";

export function maakApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin(herkomst, terug) {
        if (!herkomst) return terug(null, true);
        terug(null, HERKOMSTEN.includes(herkomst));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/winkel", winkelRoutes);
  app.use("/api/plattegronden", plattegrondRoutes);
  app.use("/api/stellingen", stellingRoutes);
  app.use("/api/producten", productRoutes);
  app.use("/api/productgroepen", productgroepRoutes);
  app.use("/api/partijen", partijRoutes);
  app.use("/api/vakken", vakRoutes);
  app.use("/api/werklijst", werklijstRoutes);
  app.use("/api/overzicht", overzichtRoutes);

  // Route bestaat niet.
  app.use((req, res) => {
    res.status(404).json({
      fout: `Geen route gevonden voor ${req.method} ${req.originalUrl}`,
    });
  });

  app.use((fout, req, res, _next) => {
    if (fout.status) {
      return res.status(fout.status).json({ fout: fout.message, ...fout.gegevens });
    }

    console.error("Onverwachte fout:", fout);
    res.status(500).json({
      fout: "Er ging iets mis op de server",
      ...(OMGEVING === "development" ? { details: fout.message } : {}),
    });
  });

  return app;
}
