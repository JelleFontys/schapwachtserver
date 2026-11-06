// Losse stellingen: bekijken, aanpassen, weghalen.

import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd, alleenLeidinggevende } from "../middleware/ingelogd.js";
import * as stellingen from "../diensten/stellingDienst.js";

const router = Router();

router.use(ingelogd);

// GET /api/stellingen/:id
router.get(
  "/:id",
  vangFouten(async (req, res) => {
    res.json(await stellingen.haal(req.gebruiker.winkelId, req.params.id));
  }),
);

// PATCH /api/stellingen/:id   { links, rechts, losmaken? }
router.patch(
  "/:id",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.json(await stellingen.wijzig(req.gebruiker.winkelId, req.params.id, req.body ?? {}));
  }),
);

// DELETE /api/stellingen/:id?losmaken=ja
//
// Bevestigen gaat via de URL en niet via een body, omdat niet elke
// proxy een body bij DELETE doorgeeft.
router.delete(
  "/:id",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    await stellingen.verwijder(req.gebruiker.winkelId, req.params.id, {
      losmaken: req.query.losmaken === "ja",
    });
    res.status(204).end();
  }),
);

export default router;
