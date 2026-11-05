// Plattegronden van de eigen winkel.
//
// Bekijken mag iedereen in de winkel. Aanmaken en het raster aanpassen
// alleen de leidinggevende: een medewerker die per ongeluk een raster
// verkleint, kan producten hun plek laten kwijtraken. Dat is een keuze
// die past bij hoe een winkel werkt, maar SW-40 (rollen) kan hem nog
// verschuiven.

import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd, alleenLeidinggevende } from "../middleware/ingelogd.js";
import * as dienst from "../diensten/plattegrondDienst.js";

const router = Router();

router.use(ingelogd);

// GET /api/plattegronden
router.get(
  "/",
  vangFouten(async (req, res) => {
    res.json(await dienst.lijst(req.gebruiker.winkelId));
  }),
);

// POST /api/plattegronden
router.post(
  "/",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.status(201).json(await dienst.maak(req.gebruiker.winkelId, req.body ?? {}));
  }),
);

// GET /api/plattegronden/:id
router.get(
  "/:id",
  vangFouten(async (req, res) => {
    res.json(await dienst.haal(req.gebruiker.winkelId, req.params.id));
  }),
);

// PATCH /api/plattegronden/:id
router.patch(
  "/:id",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.json(await dienst.wijzig(req.gebruiker.winkelId, req.params.id, req.body ?? {}));
  }),
);

export default router;
