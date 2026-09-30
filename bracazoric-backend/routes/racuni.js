const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();
const pool = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

function toNumber(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function toCents(value) {
  const number = toNumber(value);
  return number === null ? null : Math.round(number * 100);
}

function centsToMoney(cents) {
  return (cents / 100).toFixed(2);
}

function normalizeStavke(rawStavke) {
  if (!Array.isArray(rawStavke) || rawStavke.length === 0) {
    const error = new Error("Račun mora imati barem jednu stavku.");
    error.status = 400;
    throw error;
  }

  return rawStavke.map((raw) => {
    const naziv = String(raw?.naziv || "").trim();
    const status = raw?.status === "NEMA_NA_STANJU" ? "NEMA_NA_STANJU" : "ISPORUCENO";

    if (!naziv) {
      const error = new Error("Račun sadrži stavku bez naziva.");
      error.status = 400;
      throw error;
    }

    if (status === "NEMA_NA_STANJU") {
      return {
        naziv,
        trazeno: String(raw?.trazeno || naziv),
        kolicina: null,
        jedinica: String(raw?.jedinica || "kg/kom"),
        cijenaCents: null,
        iznosCents: 0,
        status,
      };
    }

    const kolicina = toNumber(raw?.kolicina);
    const cijenaCents = toCents(raw?.cijena);

    if (kolicina === null || kolicina <= 0 || cijenaCents === null || cijenaCents <= 0) {
      const error = new Error(`Neispravna količina ili cijena za stavku: ${naziv}`);
      error.status = 400;
      throw error;
    }

    const iznosCents = Math.round(kolicina * cijenaCents);

    return {
      naziv,
      trazeno: raw?.trazeno ? String(raw.trazeno) : null,
      kolicina,
      jedinica: String(raw?.jedinica || "kg/kom"),
      cijenaCents,
      iznosCents,
      status,
    };
  });
}

function napraviOpis(stavke, rucniRacun) {
  const redovi = stavke.map((stavka) => {
    if (stavka.status === "NEMA_NA_STANJU") {
      return `❌ ${stavka.naziv}: NEMA NA STANJU`;
    }

    return `🔸 ${stavka.naziv}: ${stavka.kolicina} ${stavka.jedinica} x ${centsToMoney(stavka.cijenaCents)} KM = ${centsToMoney(stavka.iznosCents)} KM`;
  });

  if (rucniRacun) {
    redovi.push("", "(IZDATO RUČNO IZ MAGACINA)");
  }

  return redovi.join("\n");
}

const SELECT_RACUNI = `
  SELECT
    r.id,
    r.narudzba_id,
    r.trgovina_id,
    r.opis,
    r.iznos,
    r.uplaceno,
    r.placen,
    r.created_at AS "createdAt",
    TO_CHAR(r.created_at AT TIME ZONE 'Europe/Belgrade', 'DD. MM. YYYY. HH24:MI:SS') AS datum,
    k.naziv AS "trgovinaIme",
    COALESCE(
      (
        SELECT JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', sr.id,
            'naziv', sr.naziv,
            'trazeno', sr.trazeno,
            'kolicina', sr.stvarna_kolicina,
            'jedinica', sr.jedinica,
            'cijena', sr.cijena_jedinicna,
            'iznos', sr.iznos,
            'status', sr.status
          )
          ORDER BY sr.id ASC
        )
        FROM stavke_racuna sr
        WHERE sr.racun_id = r.id
      ),
      '[]'::json
    ) AS stavke
  FROM racuni r
  JOIN korisnici k ON r.trgovina_id = k.id
`;

router.get(
  "/moji",
  authenticate,
  requireRole("trgovina"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `${SELECT_RACUNI}
         WHERE r.trgovina_id = $1
         ORDER BY r.created_at DESC, r.id DESC`,
        [req.user.id]
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Greška kod dohvatanja računa trgovine:", error);
      return res.status(500).json({ success: false, message: "Greška na serveru." });
    }
  }
);

router.get(
  "/",
  authenticate,
  requireRole("firma"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `${SELECT_RACUNI}
         ORDER BY r.created_at DESC, r.id DESC`
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Greška kod dohvatanja računa:", error);
      return res.status(500).json({ success: false, message: "Greška na serveru." });
    }
  }
);

router.post(
  "/",
  authenticate,
  requireRole("firma"),
  async (req, res) => {
    const { narudzbaId, trgovinaId, stavke: rawStavke } = req.body;

    if (!trgovinaId) {
      return res.status(400).json({
        success: false,
        message: "Trgovina je obavezna.",
      });
    }

    let stavke;

    try {
      stavke = normalizeStavke(rawStavke);
    } catch (error) {
      return res.status(error.status || 400).json({
        success: false,
        message: error.message,
      });
    }

    const ukupanIznosCents = stavke.reduce(
      (sum, stavka) => sum + stavka.iznosCents,
      0
    );

    const imaNedostupnih = stavke.some(
      (stavka) => stavka.status === "NEMA_NA_STANJU"
    );

    if (ukupanIznosCents <= 0 && !imaNedostupnih) {
      return res.status(400).json({
        success: false,
        message: "Račun ne može biti 0 KM.",
      });
    }

    const racunId = randomUUID();
    const createdAt = new Date();
    const datum = createdAt.toISOString();
    const opis = napraviOpis(stavke, !narudzbaId);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const trgovinaResult = await client.query(
        `SELECT id
         FROM korisnici
         WHERE id = $1 AND role = 'trgovina'
         LIMIT 1`,
        [trgovinaId]
      );

      if (trgovinaResult.rows.length === 0) {
        const error = new Error("Trgovina ne postoji.");
        error.status = 404;
        throw error;
      }

      if (narudzbaId) {
        const orderResult = await client.query(
          `SELECT status, trgovina_id
           FROM narudzbe
           WHERE id = $1
           FOR UPDATE`,
          [narudzbaId]
        );

        if (orderResult.rows.length === 0) {
          const error = new Error("Narudžba ne postoji.");
          error.status = 404;
          throw error;
        }

        if (orderResult.rows[0].trgovina_id !== trgovinaId) {
          const error = new Error("Narudžba ne pripada odabranoj trgovini.");
          error.status = 400;
          throw error;
        }

        if (orderResult.rows[0].status === "Račun napravljen") {
          const error = new Error("Za ovu narudžbu je račun već napravljen.");
          error.status = 409;
          throw error;
        }
      }

      await client.query(
        `INSERT INTO racuni (
          id, narudzba_id, trgovina_id, opis, iznos, datum, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          racunId,
          narudzbaId || null,
          trgovinaId,
          opis,
          centsToMoney(ukupanIznosCents),
          datum,
          createdAt,
        ]
      );

      for (const stavka of stavke) {
        await client.query(
          `INSERT INTO stavke_racuna (
            racun_id,
            naziv,
            trazeno,
            stvarna_kolicina,
            jedinica,
            cijena_jedinicna,
            iznos,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            racunId,
            stavka.naziv,
            stavka.trazeno,
            stavka.kolicina,
            stavka.jedinica,
            stavka.cijenaCents === null ? null : centsToMoney(stavka.cijenaCents),
            centsToMoney(stavka.iznosCents),
            stavka.status,
          ]
        );
      }

      if (narudzbaId) {
        await client.query(
          `UPDATE narudzbe
           SET status = 'Račun napravljen'
           WHERE id = $1`,
          [narudzbaId]
        );
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        racunId,
        iznos: centsToMoney(ukupanIznosCents),
        createdAt: createdAt.toISOString(),
        message: "Račun kreiran!",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Greška kod kreiranja računa:", error);

      return res.status(error.status || 500).json({
        success: false,
        message: error.status ? error.message : "Greška na serveru.",
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
