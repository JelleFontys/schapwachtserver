// Waar ligt iets? Van een vak terug naar de plattegrond.
//
// Een partij weet alleen zijn vak. Om te zeggen "Winkel, Koek en snoep,
// rij 2, vak 3" moet je via de plank, de kant en de stelling terug naar
// de plattegrond. Die weg staat hier één keer, zodat de werklijst, de
// scanner en de stellingen hetzelfde zeggen.

import { Plattegrond, Stelling, Stellingkant, Plank, Vak } from "../modellen/index.js";
import { nietGevonden } from "../kern/hulp.js";
import { plekNaam } from "../kern/stelling.js";

/** De include om vanaf een partij of vak de hele plek mee te laden. */
export function plekInclude({ verplicht = false, winkelId } = {}) {
  return {
    model: Vak,
    required: verplicht,
    include: [
      {
        model: Plank,
        required: true,
        include: [
          {
            model: Stellingkant,
            required: true,
            include: [
              {
                model: Stelling,
                required: true,
                include: [
                  {
                    model: Plattegrond,
                    required: true,
                    attributes: ["id", "naam", "winkelId"],
                    ...(winkelId ? { where: { winkelId } } : {}),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Een geladen vak als leesbare plek, of null als er geen vak is. */
export function plekVan(vak) {
  if (!vak) return null;
  const plank = vak.Plank;
  const kant = plank.Stellingkant;
  const stelling = kant.Stelling;
  const plattegrond = stelling.Plattegrond;

  return {
    vakId: vak.id,
    plattegrondId: plattegrond.id,
    plattegrond: plattegrond.naam,
    stellingId: stelling.id,
    kant: kant.naam,
    rij: plank.nummer,
    vak: vak.positie,
    tekst: plekNaam(kant.naam, plank.nummer, vak.positie),
  };
}

/**
 * Een vak van deze winkel, met de hele weg naar de plattegrond, of 404.
 * Wie een product in een vak zet, moet niet een vak van een andere
 * winkel kunnen kiezen door een id te raden.
 */
export async function zoekVak(winkelId, vakId, transaction) {
  const vak = await Vak.findOne({
    where: { id: vakId },
    include: plekInclude({ winkelId }).include,
    transaction,
  });
  if (!vak) throw nietGevonden("Dit vak bestaat niet.");
  return vak;
}
