export const STATUSSEN = ["RUIM", "AFPRIJZEN", "OVER"];

export const STANDAARD_AFPRIJS_DAGEN = 2;

export const TIJDZONE = "Europe/Amsterdam";

const datumNotatie = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIJDZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function vandaag(nu = new Date()) {
  return datumNotatie.format(nu);
}

export function datumVan(tijdstip) {
  return datumNotatie.format(new Date(tijdstip));
}

export function dagenTussen(van, tot) {
  const [vj, vm, vd] = van.split("-").map(Number);
  const [tj, tm, td] = tot.split("-").map(Number);
  return Math.round((Date.UTC(tj, tm - 1, td) - Date.UTC(vj, vm - 1, vd)) / 86_400_000);
}

export function verschuif(datum, dagen) {
  const [j, m, d] = datum.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, d + dagen)).toISOString().slice(0, 10);
}

export function statusVan(houdbaarTot, afprijsDagen, opDatum = vandaag()) {
  const dagen = dagenTussen(opDatum, houdbaarTot);
  if (dagen < 0) return "OVER";
  if (dagen <= afprijsDagen) return "AFPRIJZEN";
  return "RUIM";
}

export function afprijsDagenVan(product) {
  return product?.Productgroep?.afprijsDagen ?? STANDAARD_AFPRIJS_DAGEN;
}

export function ernstigste(statussen) {
  let uit = null;
  for (const status of statussen) {
    if (status && (uit === null || STATUSSEN.indexOf(status) > STATUSSEN.indexOf(uit))) {
      uit = status;
    }
  }
  return uit;
}
