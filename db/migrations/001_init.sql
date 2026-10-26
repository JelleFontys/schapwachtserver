-- Eerste opzet van de database van SchapWacht.
--
-- De belangrijkste ontwerpkeuze zit in de tabel `partij`: een
-- houdbaarheidsdatum hoort bij een partij en niet bij een product.
-- Hetzelfde product kan op twee plekken liggen met verschillende
-- datums, en achter in een vak kan nog oude voorraad staan.

CREATE TABLE winkel (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  naam              VARCHAR(120) NOT NULL,
  uitnodigingscode  VARCHAR(40)  NOT NULL,
  aangemaakt_op     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bijgewerkt_op     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_winkel_code (uitnodigingscode)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE gebruiker (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  winkel_id        CHAR(36)     NOT NULL,
  naam             VARCHAR(120) NOT NULL,
  email            VARCHAR(190) NOT NULL,
  wachtwoord_hash  VARCHAR(255) NOT NULL,
  rol              ENUM('MEDEWERKER','LEIDINGGEVENDE') NOT NULL DEFAULT 'MEDEWERKER',
  aangemaakt_op    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bijgewerkt_op    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_gebruiker_email (email),
  KEY ix_gebruiker_winkel (winkel_id),
  CONSTRAINT fk_gebruiker_winkel FOREIGN KEY (winkel_id)
    REFERENCES winkel (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE plattegrond (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  winkel_id      CHAR(36)     NOT NULL,
  naam           VARCHAR(120) NOT NULL,
  rijen          SMALLINT UNSIGNED NOT NULL,
  kolommen       SMALLINT UNSIGNED NOT NULL,
  aangemaakt_op  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bijgewerkt_op  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plattegrond_naam (winkel_id, naam),
  CONSTRAINT fk_plattegrond_winkel FOREIGN KEY (winkel_id)
    REFERENCES winkel (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE vak (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  plattegrond_id  CHAR(36)     NOT NULL,
  rij             SMALLINT UNSIGNED NOT NULL,
  kolom           SMALLINT UNSIGNED NOT NULL,
  -- Herkenbare naam voor in de winkel, bijvoorbeeld "Stelling B, plank 3".
  naam            VARCHAR(120) NULL,
  UNIQUE KEY uq_vak_positie (plattegrond_id, rij, kolom),
  CONSTRAINT fk_vak_plattegrond FOREIGN KEY (plattegrond_id)
    REFERENCES plattegrond (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE productgroep (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  winkel_id      CHAR(36)     NOT NULL,
  naam           VARCHAR(120) NOT NULL,
  -- Hoeveel dagen voor de houdbaarheidsdatum er afgeprijsd wordt.
  afprijs_dagen  SMALLINT UNSIGNED NOT NULL DEFAULT 2,
  aangemaakt_op  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bijgewerkt_op  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_productgroep_naam (winkel_id, naam),
  CONSTRAINT fk_productgroep_winkel FOREIGN KEY (winkel_id)
    REFERENCES winkel (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE product (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  winkel_id       CHAR(36)     NOT NULL,
  productgroep_id CHAR(36)     NULL,
  naam            VARCHAR(190) NOT NULL,
  barcode         VARCHAR(40)  NULL,
  aangemaakt_op   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bijgewerkt_op   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Binnen één winkel mag een barcode maar één keer voorkomen. MySQL
  -- staat meerdere NULL-waarden toe in een unieke index, dus producten
  -- zonder barcode blijven mogelijk.
  UNIQUE KEY uq_product_barcode (winkel_id, barcode),
  KEY ix_product_winkel (winkel_id),
  CONSTRAINT fk_product_winkel FOREIGN KEY (winkel_id)
    REFERENCES winkel (id) ON DELETE CASCADE,
  CONSTRAINT fk_product_groep FOREIGN KEY (productgroep_id)
    REFERENCES productgroep (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE partij (
  id                CHAR(36) NOT NULL PRIMARY KEY,
  product_id        CHAR(36) NOT NULL,
  -- Mag leeg zijn: als het raster kleiner wordt gemaakt raken partijen
  -- hun plek kwijt, maar ze worden niet verwijderd.
  vak_id            CHAR(36) NULL,
  houdbaar_tot      DATE     NOT NULL,
  -- Indicatief, geen voorraadadministratie: de kassa weet niet welke
  -- partij verkocht is.
  aantal            INT UNSIGNED NULL,
  status            ENUM('ACTIEF','AFGEMELD') NOT NULL DEFAULT 'ACTIEF',
  uitkomst          ENUM('GESTICKERD','UITVERKOCHT','WEGGEGOOID') NULL,
  afgemeld_op       DATETIME NULL,
  afgemeld_door_id  CHAR(36) NULL,
  aangemaakt_op     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bijgewerkt_op     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- De werklijst vraagt actieve partijen op, gesorteerd op datum.
  KEY ix_partij_werklijst (status, houdbaar_tot),
  KEY ix_partij_vak (vak_id),
  KEY ix_partij_product (product_id),
  CONSTRAINT fk_partij_product FOREIGN KEY (product_id)
    REFERENCES product (id) ON DELETE CASCADE,
  CONSTRAINT fk_partij_vak FOREIGN KEY (vak_id)
    REFERENCES vak (id) ON DELETE SET NULL,
  CONSTRAINT fk_partij_gebruiker FOREIGN KEY (afgemeld_door_id)
    REFERENCES gebruiker (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
