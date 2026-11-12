// Partijen: in een vak zetten, afmelden, opnieuw plaatsen. Dit is het
// werk op de vloer, dus dit mag iedereen in de winkel.

import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd } from "../middleware/ingelogd.js";
import * as dienst from "../diensten/partijDienst.js";

const router = Router();
router.use(ingelogd);

// POST /api/partijen   { vakId, productId, houdbaarTot, aantal? }
router.post(
  "/",
  vangFouten(async (req, res) => {
    res.status(201).json(await dienst.voegToe(req.gebruiker.winkelId, req.body ?? {}));
  }),
);

// POST /api/partijen/:id/afmelden   { uitkomst: "GESTICKERD" | "UITVERKOCHT" | "WEGGEGOOID" }
router.post(
  "/:id/afmelden",
  vangFouten(async (req, res) => {
    res.json(
      await dienst.afmelden(req.gebruiker.winkelId, req.gebruiker.id, req.params.id, req.body ?? {}),
    );
  }),
);

// PATCH /api/partijen/:id   { vakId }   een partij zonder plek opnieuw plaatsen
router.patch(
  "/:id",
  vangFouten(async (req, res) => {
    res.json(await dienst.plaats(req.gebruiker.winkelId, req.params.id, req.body ?? {}));
  }),
);

export default router;
