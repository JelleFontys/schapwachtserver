// Losse vakken.
//
// Een vak een naam geven mag iedereen in de winkel: de medewerker die
// de schappen vult weet vaak beter dan de leidinggevende hoe een plank
// in de winkel genoemd wordt.

import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd } from "../middleware/ingelogd.js";
import { hernoemVak } from "../diensten/plattegrondDienst.js";

const router = Router();

router.use(ingelogd);

// PATCH /api/vakken/:id
router.patch(
  "/:id",
  vangFouten(async (req, res) => {
    res.json(await hernoemVak(req.gebruiker.winkelId, req.params.id, req.body ?? {}));
  }),
);

export default router;
