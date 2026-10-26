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
| Databasetoegang | mysql2, met SQL die je zelf schrijft |
| Migraties | Losse `.sql`-bestanden met een eigen runner |
| Tests | Vitest en Supertest |

## Opbouw

```
server.js           startpunt: bouwt de app en start hem
kern/
  config.js         omgeving, database, toegestane herkomsten
  db.js             verbindingspool en queryhulpjes
  hulp.js           id's, fouttypes, validatie
  app.js            zet Express in elkaar (zonder te starten)
routes/
  health.js         controle of API en database leven
db/
  migrations/       genummerde .sql-bestanden
  migrate.js        voert ze uit en houdt bij wat al gedaan is
  seed.js           testdata voor de demo
tests/              unit- en integratietests
```

Het starten zit in `server.js` en het bouwen in `kern/app.js`. Daardoor
kunnen tests de app rechtstreeks aanroepen zonder dat er een poort opengaat.

## Starten

```bash
npm install
npm run db:migrate     # tabellen aanmaken
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
| `npm run db:migrate` | Voert nieuwe migraties uit |
| `npm run db:reset` | Gooit alle tabellen weg en bouwt opnieuw op |
| `npm run db:seed` | Zet testdata in de database |

## Migraties

Elke wijziging aan de database is een genummerd bestand in
`db/migrations/`, bijvoorbeeld `002_voeg_kolom_toe.sql`. De runner houdt
in de tabel `migratie` bij welke bestanden al gedraaid zijn en slaat die
over, dus `npm run db:migrate` kan altijd opnieuw. Elk bestand draait in
één transactie.

Er zit geen ORM tussen: de SQL die draait is de SQL die in de map staat.

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

Migraties draaien niet vanzelf mee. Voer na een uitrol `npm run db:migrate`
uit in de container, of zet dat in Dokploy als commando dat na het
uitrollen draait.
