// De eigen winkel.
//
// Let op het ontbreken van een winkelId in de URL. Je kunt alleen je
// eigen winkel opvragen, en welke dat is komt uit het token en niet
// uit het verzoek. Daarmee is er geen URL te bedenken die de gegevens
// van een andere winkel teruggeeft.

import { Router } from "express";

import { vangFouten, nietGevonden } from "../kern/hulp.js";
import { ingelogd, alleenLeidinggevende } from "../middleware/ingelogd.js";
import { Winkel, Gebruiker } from "../modellen/index.js";

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
    const medewerkers = await Gebruiker.findAll({
      where: { winkelId: req.gebruiker.winkelId },
      order: [["naam", "ASC"]],
    });

    res.json(
      medewerkers.map((m) => ({ id: m.id, naam: m.naam, email: m.email, rol: m.rol })),
    );
  }),
);

export default router;
