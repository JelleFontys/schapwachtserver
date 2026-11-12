// De eigen winkel.
//
// Let op het ontbreken van een winkelId in de URL. Je kunt alleen je
// eigen winkel opvragen, en welke dat is komt uit het token en niet
// uit het verzoek. Daarmee is er geen URL te bedenken die de gegevens
// van een andere winkel teruggeeft.

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
      // De code is het wachtwoord van de winkel: wie hem heeft, kan
      // een account aanmaken dat alle gegevens ziet. Daarom alleen
      // voor de leidinggevende.
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
