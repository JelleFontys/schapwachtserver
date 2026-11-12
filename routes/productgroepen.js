import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd, alleenLeidinggevende } from "../middleware/ingelogd.js";
import * as dienst from "../diensten/productgroepDienst.js";

const router = Router();
router.use(ingelogd);

const winkel = (req) => req.gebruiker.winkelId;

router.get(
  "/",
  vangFouten(async (req, res) => {
    res.json(await dienst.lijst(winkel(req)));
  }),
);

router.post(
  "/",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.status(201).json(await dienst.maak(winkel(req), req.body ?? {}));
  }),
);

router.patch(
  "/:id",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.json(await dienst.wijzig(winkel(req), req.params.id, req.body ?? {}));
  }),
);

router.delete(
  "/:id",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    await dienst.verwijder(winkel(req), req.params.id);
    res.status(204).end();
  }),
);

export default router;
