// Een heel vak in één keer leegmelden (SW-29).

import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd } from "../middleware/ingelogd.js";
import { leegmelden } from "../diensten/partijDienst.js";

const router = Router();
router.use(ingelogd);

// POST /api/vakken/:id/leegmelden   { uitkomst }
router.post(
  "/:id/leegmelden",
  vangFouten(async (req, res) => {
    res.json(await leegmelden(req.gebruiker.winkelId, req.gebruiker.id, req.params.id, req.body ?? {}));
  }),
);

export default router;
