import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd, alleenLeidinggevende } from "../middleware/ingelogd.js";
import { weggegooid } from "../diensten/overzichtDienst.js";

const router = Router();
router.use(ingelogd, alleenLeidinggevende);

// GET /api/overzicht/weggegooid?van=2026-11-01&tot=2026-11-30
router.get(
  "/weggegooid",
  vangFouten(async (req, res) => {
    res.json(await weggegooid(req.gebruiker.winkelId, req.query));
  }),
);

export default router;
