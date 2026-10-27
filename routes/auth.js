// Registreren, inloggen, uitloggen en opvragen wie je bent.

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
    // Eerst het e-mailadres controleren, want de teller heeft het
    // nodig als sleutel.
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

// POST /api/auth/uitloggen
//
// Hier gebeurt bewust niets aan de serverkant. Een JWT is niet
// in te trekken: hij is geldig tot hij verloopt. Uitloggen betekent
// dus dat de browser zijn token weggooit. Deze route bestaat zodat de
// front-end één plek heeft om dat aan te roepen, en zodat het
// duidelijk is dat dit geen vergissing is maar een gevolg van de
// keuze voor tokens in plaats van sessies.
router.post("/uitloggen", (req, res) => {
  res.json({ bericht: "Uitgelogd. Gooi het token weg aan de clientkant." });
});

// GET /api/auth/ik
//
// De front-end gebruikt dit na het herladen van de pagina om te weten
// of het bewaarde token nog geldig is en wie erbij hoort.
router.get("/ik", ingelogd, (req, res) => {
  res.json({ gebruiker: naarBuiten(req.gebruiker) });
});

export default router;
