import { Router } from "express";

import { vangFouten, nietGevonden } from "../kern/hulp.js";
import { ingelogd, alleenLeidinggevende } from "../middleware/ingelogd.js";
import { Winkel } from "../modellen/index.js";
import * as team from "../diensten/teamDienst.js";

const router = Router();

router.use(ingelogd);

// GET /api/winkel
router.get(
  "/",
  vangFouten(async (req, res) => {
    const winkel = await Winkel.findByPk(req.gebruiker.winkelId);
    if (!winkel) throw nietGevonden("Deze winkel bestaat niet meer.");

    res.json({
      id: winkel.id,
      naam: winkel.naam,
      ...(req.gebruiker.rol === "LEIDINGGEVENDE"
        ? { uitnodigingscode: winkel.uitnodigingscode }
        : {}),
    });
  }),
);

// GET /api/winkel/medewerkers
router.get(
  "/medewerkers",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.json(await team.lijst(req.gebruiker.winkelId));
  }),
);

// PATCH /api/winkel/medewerkers/:id   { rol }   (SW-40)
router.patch(
  "/medewerkers/:id",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.json(await team.wijzigRol(req.gebruiker.winkelId, req.params.id, req.body ?? {}));
  }),
);

export default router;
