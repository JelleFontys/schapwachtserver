// Het assortiment (SW-25) en opzoeken op barcode (SW-37).
//
// Een product aanmaken en aanpassen mag iedereen: wie een onbekend
// product scant (SW-38) moet het meteen kunnen toevoegen. Weghalen mag
// alleen de leidinggevende.

import { Router } from "express";

import { vangFouten } from "../kern/hulp.js";
import { ingelogd, alleenLeidinggevende } from "../middleware/ingelogd.js";
import * as dienst from "../diensten/productDienst.js";

const router = Router();
router.use(ingelogd);

const winkel = (req) => req.gebruiker.winkelId;

// GET /api/producten?zoek=melk
router.get(
  "/",
  vangFouten(async (req, res) => {
    res.json(await dienst.lijst(winkel(req), { zoek: req.query.zoek }));
  }),
);

// GET /api/producten/barcode/:code   (vóór /:id, anders denkt Express dat "barcode" een id is)
router.get(
  "/barcode/:code",
  vangFouten(async (req, res) => {
    res.json(await dienst.opBarcode(winkel(req), req.params.code));
  }),
);

// GET /api/producten/:id
router.get(
  "/:id",
  vangFouten(async (req, res) => {
    res.json(await dienst.haal(winkel(req), req.params.id));
  }),
);

// POST /api/producten   { naam, barcode?, productgroepId? }
router.post(
  "/",
  vangFouten(async (req, res) => {
    res.status(201).json(await dienst.maak(winkel(req), req.body ?? {}));
  }),
);

// PATCH /api/producten/:id
router.patch(
  "/:id",
  vangFouten(async (req, res) => {
    res.json(await dienst.wijzig(winkel(req), req.params.id, req.body ?? {}));
  }),
);

// DELETE /api/producten/:id
router.delete(
  "/:id",
  alleenLeidinggevende,
  vangFouten(async (req, res) => {
    await dienst.verwijder(winkel(req), req.params.id);
    res.status(204).end();
  }),
);

export default router;
