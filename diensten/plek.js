import { Plattegrond, Stelling, Stellingkant, Plank, Vak } from "../modellen/index.js";
import { nietGevonden } from "../kern/hulp.js";
import { plekNaam } from "../kern/stelling.js";

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

export async function zoekVak(winkelId, vakId, transaction) {
  const vak = await Vak.findOne({
    where: { id: vakId },
    include: plekInclude({ winkelId }).include,
    transaction,
  });
  if (!vak) throw nietGevonden("Dit vak bestaat niet.");
  return vak;
}
