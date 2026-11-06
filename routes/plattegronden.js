// Plattegronden van de eigen winkel, en de stellingen die erop komen.
//
// Bekijken mag iedereen in de winkel. De vloer en de stellingen
// inrichten alleen de leidinggevende: een medewerker die per ongeluk
// een stelling weghaalt, laat producten hun plek kwijtraken. Dat is een
// keuze die past bij hoe een winkel werkt, maar SW-40 (rollen) kan hem
// nog verschuiven.

import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd, alleenLeidinggevende } from "../middleware/ingelogd.js";
import * as plattegronden from "../diensten/plattegrondDienst.js";
import * as stellingen from "../diensten/stellingDienst.js";

const router = Router();

router.use(ingelogd);

const winkel = (req) => req.gebruiker.winkelId;

// GET /api/plattegronden
router.get(
  "/",
  vangFouten(async (req, res) => {
    res.json(await plattegronden.lijst(winkel(req)));
  }),
);

// POST /api/plattegronden   { naam }
router.post(
  "/",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.status(201).json(await plattegronden.maak(winkel(req), req.body ?? {}));
  }),
);

// GET /api/plattegronden/:id
router.get(
  "/:id",
  vangFouten(async (req, res) => {
    res.json(await plattegronden.haal(winkel(req), req.params.id));
  }),
);

// PATCH /api/plattegronden/:id   { naam }
router.patch(
  "/:id",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.json(await plattegronden.hernoem(winkel(req), req.params.id, req.body ?? {}));
  }),
);

// POST /api/plattegronden/:id/rand   { rand: "boven" | "onder" | "links" | "rechts", actie: "erbij" | "eraf" }
router.post(
  "/:id/rand",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.json(await plattegronden.pasRandAan(winkel(req), req.params.id, req.body ?? {}));
  }),
);

// POST /api/plattegronden/:id/stellingen   { x, y, breedte, hoogte, links, rechts }
router.post(
  "/:id/stellingen",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    res.status(201).json(await stellingen.maak(winkel(req), req.params.id, req.body ?? {}));
  }),
);

export default router;
