// Controle of de API en de database leven.

import { Router } from "express";

import { databaseLeeft } from "../kern/db.js";
import { vangFouten } from "../kern/hulp.js";

const router = Router();

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
