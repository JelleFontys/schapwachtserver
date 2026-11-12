// De werklijst (SW-34): alle actieve partijen, kortst houdbaar bovenaan.

import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd } from "../middleware/ingelogd.js";
import { werklijst } from "../diensten/partijDienst.js";
import { vandaag } from "../kern/status.js";

const router = Router();
router.use(ingelogd);

// GET /api/werklijst
//
// `vandaag` gaat mee, zodat de app dezelfde datum gebruikt als de
// server. De telefoon kan een andere tijd hebben, en dan zou "nog 2
// dagen" op de telefoon iets anders betekenen dan de kleur die de server
// berekende.
router.get(
  "/",
  vangFouten(async (req, res) => {
    res.json({ vandaag: vandaag(), partijen: await werklijst(req.gebruiker.winkelId) });
  }),
);

export default router;
