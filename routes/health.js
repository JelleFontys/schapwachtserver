// Controle of de API en de database leven.

import { Router } from "express";

import { databaseLeeft } from "../kern/db.js";
import { vangFouten } from "../kern/hulp.js";

const router = Router();

// GET /api/health
//
// Een onbereikbare database maakt dit verzoek niet kapot: je krijgt nog
// steeds 200, met database: "onbereikbaar". Zo blijft deze route
// bruikbaar om te zien wát er stuk is in plaats van alleen dát er iets
// stuk is.
router.get(
  "/",
  vangFouten(async (req, res) => {
    res.json({
      status: "ok",
      database: (await databaseLeeft()) ? "ok" : "onbereikbaar",
      tijdstip: new Date().toISOString(),
    });
  }),
);

export default router;
