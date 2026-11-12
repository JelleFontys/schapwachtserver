import { Router } from "express";

import { vangFouten, HttpFout } from "../kern/hulp.js";
import { ingelogd } from "../middleware/ingelogd.js";
import { registreer, logIn, naarBuiten } from "../diensten/authDienst.js";
import { wachttijd, pogingMislukt, pogingGelukt } from "../kern/pogingen.js";
import * as controle from "../kern/controle.js";

const router = Router();

// POST /api/auth/registreer
router.post(
  "/registreer",
  vangFouten(async (req, res) => {
    const resultaat = await registreer(req.body ?? {});
    res.status(201).json(resultaat);
  }),
);

// POST /api/auth/inloggen
router.post(
  "/inloggen",
  vangFouten(async (req, res) => {
    const email = controle.email((req.body ?? {}).email);
    const ip = req.ip ?? "onbekend";

    const seconden = wachttijd(email, ip);
    if (seconden > 0) {
      const minuten = Math.ceil(seconden / 60);
      throw new HttpFout(
        429,
        `Te veel mislukte pogingen. Probeer het over ${minuten} minuten opnieuw.`,
      );
    }

    try {
      const resultaat = await logIn({ ...(req.body ?? {}), email });
      pogingGelukt(email, ip);
      res.json(resultaat);
    } catch (fout) {
      if (fout.status === 401) pogingMislukt(email, ip);
      throw fout;
    }
  }),
);

router.post("/uitloggen", (req, res) => {
  res.json({ bericht: "Uitgelogd. Gooi het token weg aan de clientkant." });
});

router.get("/ik", ingelogd, (req, res) => {
  res.json({ gebruiker: naarBuiten(req.gebruiker) });
});

export default router;
