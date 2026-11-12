import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd } from "../middleware/ingelogd.js";
import { werklijst } from "../diensten/partijDienst.js";
import { vandaag } from "../kern/status.js";

const router = Router();
router.use(ingelogd);

router.get(
  "/",
  vangFouten(async (req, res) => {
    res.json({ vandaag: vandaag(), partijen: await werklijst(req.gebruiker.winkelId) });
  }),
);

export default router;
