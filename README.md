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
- **Partij**: dit product, met deze datum, in dit vak.

## API

| | |
|---|---|
| `POST /api/auth/registreer`, `/inloggen`, `/uitloggen` · `GET /api/auth/ik` | Accounts |
| `GET /api/winkel` · `GET /api/winkel/medewerkers` | De eigen winkel |
| `GET`, `POST /api/plattegronden` | Lijst, nieuwe plattegrond (alleen een naam) |
| `GET`, `PATCH /api/plattegronden/:id` | Met stellingen ophalen, hernoemen |
| `POST /api/plattegronden/:id/rand` | Rij of kolom erbij of eraf aan één kant |
| `POST /api/plattegronden/:id/stellingen` | Stelling neerzetten |
| `GET`, `PATCH`, `DELETE /api/stellingen/:id` | Stelling bekijken, inrichten, weghalen |

Alles behalve registreren en inloggen vraagt een token. Aanmaken,
aanpassen en weghalen mag alleen de leidinggevende.

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

Migraties draaien niet vanzelf mee. Voer na een uitrol `npm run db:migreer`
uit in de container, of zet dat in Dokploy als commando dat na het
uitrollen draait.
