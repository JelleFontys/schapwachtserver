# schapwachtserver

De API van SchapWacht. Houdt per schapvak bij welke producten er liggen
en tot wanneer ze houdbaar zijn, en bepaalt welke vakken vandaag
gecontroleerd moeten worden.

De front-end staat in een eigen repo: `schapwachtclient`.

## Techniek

| Onderdeel | Keuze |
|---|---|
| Runtime | Node 24 |
| Framework | Express 5 |
| Database | MySQL 8 |
| Databasetoegang | Sequelize 6 (ORM), met mysql2 als driver |
| Migraties | Umzug |
| Tests | Vitest en Supertest |

## Opbouw

```
server.js           startpunt: bouwt de app en start hem
kern/
  config.js         omgeving, database, toegestane herkomsten
  db.js             de Sequelize-verbinding
  hulp.js           id's, fouttypes, kleine hulpfuncties
  controle.js       controle op wat er binnenkomt
  token.js          inlogtokens maken en lezen
  pogingen.js       mislukte inlogpogingen tellen
  raster.js         rekenwerk aan de vloer (zonder database)
  stelling.js       rekenwerk aan kanten, rijen en vakken (zonder database)
  status.js         de statusregel: ruim, afprijzen of over de datum
  app.js            zet Express in elkaar (zonder te starten)
modellen/           de tabellen en hun relaties
middleware/         afscherming van routes
diensten/           wat er mag en wat er gebeurt
routes/             de API
db/
  migraties/        genummerde migratiebestanden
  migreer.js        voert ze uit en houdt bij wat al gedaan is
  seed.js           testdata voor de demo
tests/              unit- en routetests
```

## Hoe een winkel is opgebouwd

```
winkel ─< plattegrond ─< stelling ─< stellingkant ─< plank ─< vak ─< partij
```

- **Plattegrond**: de vloer van bovenaf, als raster van hokjes. Begint op 10 breed en 20 hoog en groeit met de plusjes aan elke kant.
- **Stelling**: een rechthoek van hokjes op de vloer.
- **Stellingkant**: links of rechts (bij een liggende stelling boven of onder), met een eigen naam, bijvoorbeeld "Koek en snoep" en "Chips". Een stelling tegen de muur heeft er één.
- **Plank**: een rij aan een kant. Rij 1 is de bovenste.
- **Vak**: één plek op een plank, waar een product staat. Plek 1 is de meest linkse.
- **Partij**: dit product, met deze datum, in dit vak. Een partij wordt
  nooit verwijderd maar *afgemeld* (gestickerd, uitverkocht of
  weggegooid), zodat het overzicht van wat er is weggegooid klopt. Een
  partij zonder vak heeft zijn plek verloren, bijvoorbeeld doordat de
  stelling is weggehaald.

Daarnaast heeft een winkel **producten** (naam, barcode) en
**productgroepen**. Een productgroep heeft een afprijsregel: hoeveel
dagen voor de datum een product oranje wordt.

## De status

De status wordt alleen hier berekend (`kern/status.js`), nooit in de
client. `dagen` is het aantal dagen tot de houdbaarheidsdatum, gerekend
in Nederlandse tijd (Europe/Amsterdam):

| Dagen | Status | Kleur |
|---|---|---|
| kleiner dan 0 | `OVER` (over de datum) | rood |
| 0 tot en met de afprijsregel | `AFPRIJZEN` | oranje |
| meer | `RUIM` (ruim houdbaar) | groen |

Een product zonder productgroep wordt 2 dagen van tevoren oranje.

Een vak, een kant of een stelling krijgt de status van zijn
**ernstigste** partij, niet die van de vroegste datum. Bij gemengde
productgroepen kan een latere datum al eerder oranje zijn. Een vals
alarm is goedkoop, een gemist alarm is duur.

## API

| | |
|---|---|
| `POST /api/auth/registreer`, `/inloggen`, `/uitloggen` · `GET /api/auth/ik` | Accounts |
| `GET /api/winkel` · `GET /api/winkel/medewerkers` | De eigen winkel en het team |
| `PATCH /api/winkel/medewerkers/:id` | Rol wijzigen (L) |
| `GET`, `POST /api/plattegronden` | Lijst, nieuwe plattegrond (alleen een naam) |
| `GET`, `PATCH /api/plattegronden/:id` | Met stellingen en hun status ophalen, hernoemen |
| `POST /api/plattegronden/:id/rand` | Rij of kolom erbij of eraf aan één kant |
| `POST /api/plattegronden/:id/stellingen` | Stelling neerzetten |
| `GET`, `PATCH`, `DELETE /api/stellingen/:id` | Stelling bekijken, inrichten, weghalen |
| `GET /api/stellingen/:id/inhoud` | Opengeklapt: rijen, vakken en wat erin ligt |
| `GET /api/producten?zoek=` · `GET /api/producten/:id` | Producten zoeken op naam of barcode |
| `GET /api/producten/barcode/:code` | Gescand product en waar het nu ligt |
| `POST`, `PATCH`, `DELETE /api/producten/:id` | Product maken, wijzigen, weghalen (weghalen: L) |
| `GET`, `POST`, `PATCH`, `DELETE /api/productgroepen` | Productgroepen en afprijsregels (wijzigen: L) |
| `POST /api/partijen` | Product met datum in een vak zetten |
| `POST /api/partijen/:id/afmelden` | Afmelden: gestickerd, uitverkocht of weggegooid |
| `PATCH /api/partijen/:id` | Product zonder plek in een vak zetten |
| `POST /api/vakken/:id/leegmelden` | Alles in een vak in één keer afmelden |
| `GET /api/werklijst` | Alle actieve producten, kortst houdbaar bovenaan |
| `GET /api/overzicht/weggegooid?van=&tot=` | Weggegooid per productgroep (L) |

Alles behalve registreren en inloggen vraagt een token. (L) betekent:
alleen de leidinggevende. Stellingen neerzetten, inrichten en weghalen
mag ook alleen de leidinggevende.

Alles is afgeschermd per winkel: het winkelnummer komt uit het token,
nooit uit de URL. Iets van een andere winkel geeft een 404.

Haal je rijen, vakken of een stelling weg terwijl er nog producten in
liggen, dan antwoordt de server eerst met 409 en de lijst producten die
hun plek kwijtraken. Stuur je het opnieuw met `"losmaken": true` (bij
`DELETE`: `?losmaken=ja`), dan gaat het door. De producten blijven
bestaan, alleen zonder vak.

Het starten zit in `server.js` en het bouwen in `kern/app.js`. Daardoor
kunnen tests de app rechtstreeks aanroepen zonder dat er een poort opengaat.

## Starten

```bash
npm install
npm run db:migreer     # tabellen aanmaken
npm run db:seed        # testdata plaatsen
npm run dev            # http://localhost:3000
```

Je hebt een MySQL nodig en een `.env` in deze map:

```
DATABASE_URL=mysql://gebruiker:wachtwoord@localhost:3306/schapwacht
TEST_DATABASE_URL=mysql://gebruiker:wachtwoord@localhost:3306/schapwacht_test
CLIENT_URL=http://localhost:5173
JWT_SECRET=iets-langs-en-willekeurigs
```

In Dokploy hoort dit niet in een bestand maar onder Environment bij de
applicatie.

## Testdata

| E-mail | Rol | Wachtwoord |
|---|---|---|
| sanne@voorbeeld.nl | Leidinggevende | `Demo1234!` |
| tim@voorbeeld.nl | Medewerker | `Demo1234!` |

De seed maakt ook een plattegrond met drie stellingen, vier
productgroepen, zes producten met barcode en acht partijen. De datums
staan ten opzichte van vandaag, zodat alle drie de kleuren er altijd in
zitten, plus één product zonder plek.

## Commando's

| Commando | Wat het doet |
|---|---|
| `npm run dev` | Start de API en herstart bij wijzigingen |
| `npm test` | Draait alle tests |
| `npm run lint` | Controleert de code met ESLint |
| `npm run db:migreer` | Voert nieuwe migraties uit |
| `npm run db:terug` | Draait de laatste migratie terug |
| `npm run db:reset` | Gooit alle tabellen weg en bouwt opnieuw op |
| `npm run db:seed` | Zet testdata in de database |

## Migraties

Elke wijziging aan de database is een genummerd bestand in
`db/migraties/`, bijvoorbeeld `002-voeg-kolom-toe.js`. Zo'n bestand
exporteert `up` (de wijziging) en `down` (hem terugdraaien) en krijgt de
`queryInterface` van Sequelize mee.

Umzug houdt in de tabel `migraties` bij welke bestanden al gedraaid
zijn en slaat die over, dus `npm run db:migreer` kan altijd opnieuw.

De modellen in `modellen/` beschrijven dezelfde tabellen, maar maken ze
niet aan: `sequelize.sync()` gebruik ik niet, omdat je dan geen
geschiedenis hebt van wat er veranderd is. De migraties zijn de bron, de
modellen zijn de toegang.

`db:reset` en `db:seed` weigeren te draaien als `NODE_ENV` op
`production` staat, zodat een verkeerd commando in Dokploy geen data
weggooit.

## Uitrollen (Dokploy)

Deze repo wordt gekoppeld als applicatie met **Nixpacks**; die herkent
Node en draait `npm install` en daarna `npm start`. Er is geen Dockerfile
en geen buildstap nodig.

Instellen onder Environment:

| Variabele | Waarde |
|---|---|
| `DATABASE_URL` | `mysql://GEBRUIKER:WACHTWOORD@NAAM-DB-SERVICE:3306/schapwacht` |
| `CLIENT_URL` | `https://schapclient.web4ever.nl` |
| `JWT_SECRET` | iets langs en willekeurigs |
| `NODE_ENV` | `production` |

Domein: `schapserv.web4ever.nl`.

`npm start` voert eerst de migraties uit en start daarna de server. Een
nieuwe migratie gaat dus vanzelf mee met de uitrol. Migraties die al
gedraaid zijn worden overgeslagen. Mislukt een migratie, dan start de
server niet, en zie je dat in de logs van Dokploy.

## CI en automatisch uitrollen

`.github/workflows/ci.yml` draait bij elke push en pull request naar
`main` de lint en de tests. Is dat groen en was het een push naar
`main`, dan vraagt de job `uitrollen` Dokploy om de API opnieuw uit te
rollen, via `POST /api/application.deploy` met de header `x-api-key`
([documentatie](https://docs.dokploy.com/docs/core/auto-deploy)).

Daarvoor zijn drie secrets nodig (GitHub → Settings → Secrets and
variables → Actions):

| Secret | Waar je het vindt |
|---|---|
| `DOKPLOY_URL` | Het adres van je Dokploy-paneel, zonder `/` aan het eind |
| `DOKPLOY_API_TOKEN` | Dokploy → Profiel → API/CLI → token maken |
| `DOKPLOY_APPLICATION_ID` | Het id van de applicatie; te vinden met `GET /api/project.all` |

Zet *Autodeploy* in Dokploy dan uit. Anders rolt Dokploy al uit bij
elke push, ook als de tests rood zijn.

Ontbreken de secrets, dan slaat de job het uitrollen over met een
waarschuwing, en blijft de pipeline groen.
