// Wanneer verdient een product aandacht? Kijkt naar hoe partijen van dat
// product zijn afgemeld in een periode.

export const MIN_AFGEMELD = 3;
export const MIN_WEGGEGOOID = 2;
export const GRENS = 0.5;

export const ADVIEZEN = ["NIET_VERKOCHT", "AFPRIJZEN_HELPT_NIET", "EERDER_AFPRIJZEN"];

// Geeft null als er niets aan de hand is, anders { aandeel, advies }.
export function beoordeel({ weggegooid = 0, uitverkocht = 0, gestickerd = 0 }) {
  const totaal = weggegooid + uitverkocht + gestickerd;
  if (totaal < MIN_AFGEMELD || weggegooid < MIN_WEGGEGOOID) return null;

  const aandeel = weggegooid / totaal;
  if (aandeel < GRENS) return null;

  let advies;
  if (uitverkocht === 0 && gestickerd === 0) advies = "NIET_VERKOCHT";
  else if (gestickerd > 0) advies = "AFPRIJZEN_HELPT_NIET";
  else advies = "EERDER_AFPRIJZEN";

  return { aandeel: Math.round(aandeel * 100) / 100, advies };
}
