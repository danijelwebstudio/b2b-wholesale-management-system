const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();
const pool = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

function toCents(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const numeric = Number(normalized);

  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100);
}

function centsToMoney(cents) {
  return (cents / 100).toFixed(2);
}

router.get(
  "/",
  authenticate,
  requireRole("firma"),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          t.id,
          t.trgovina_id,
          t.tip,
          t.iznos,
          t.opis,
          t.created_at AS "createdAt",
          TO_CHAR(t.created_at AT TIME ZONE 'Europe/Belgrade', 'DD. MM. YYYY. HH24:MI:SS') AS datum,
          k.naziv AS "trgovinaIme"
        FROM transakcije t
        JOIN korisnici k ON t.trgovina_id = k.id
        ORDER BY t.created_at DESC, t.id DESC
      `);

      return res.json(result.rows);
    } catch (error) {
      console.error("Greška kod dohvatanja istorije:", error);
      return res.status(500).json({ success: false, message: "Greška na serveru." });
    }
  }
);

router.post(
  "/primijeni",
  authenticate,
  requireRole("firma"),
  async (req, res) => {
    const { trgovinaId, tip, iznos, opis } = req.body;
    const iznosCents = toCents(iznos);

    if (!trgovinaId || !["UPLATA", "AMBALAZA"].includes(tip)) {
      return res.status(400).json({
        success: false,
        message: "Podaci transakcije nisu ispravni.",
      });
    }

    if (iznosCents === null || iznosCents <= 0) {
      return res.status(400).json({
        success: false,
        message: "Iznos mora biti veći od 0.",
      });
    }

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

      const racuniResult = await client.query(
        `SELECT id, iznos, uplaceno, created_at
         FROM racuni
         WHERE trgovina_id = $1
           AND placen = FALSE
           AND iznos > COALESCE(uplaceno, 0)
         ORDER BY created_at ASC, id ASC
         FOR UPDATE`,
        [trgovinaId]
      );

      if (racuniResult.rows.length === 0) {
        const error = new Error("Trgovina nema otvorenih računa.");
        error.status = 400;
        throw error;
      }

      const ukupanDugCents = racuniResult.rows.reduce((sum, racun) => {
        const racunCents = toCents(racun.iznos) ?? 0;
        const uplacenoCents = toCents(racun.uplaceno) ?? 0;
        return sum + Math.max(racunCents - uplacenoCents, 0);
      }, 0);

      if (iznosCents > ukupanDugCents) {
        const error = new Error("Iznos je veći od trenutnog duga.");
        error.status = 400;
        throw error;
      }

      const transakcijaId = randomUUID();
      const createdAt = new Date();
      const datum = createdAt.toISOString();

      await client.query(
        `INSERT INTO transakcije (
          id, trgovina_id, tip, iznos, opis, datum, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          transakcijaId,
          trgovinaId,
          tip,
          centsToMoney(iznosCents),
          opis || (tip === "UPLATA" ? "Uplata gotovine" : "Povrat ambalaže"),
          datum,
          createdAt,
        ]
      );

      let preostaloCents = iznosCents;
      const alokacije = [];

      for (const racun of racuniResult.rows) {
        if (preostaloCents <= 0) break;

        const racunCents = toCents(racun.iznos) ?? 0;
        const vecUplacenoCents = toCents(racun.uplaceno) ?? 0;
        const dugRacunaCents = Math.max(racunCents - vecUplacenoCents, 0);

        if (dugRacunaCents <= 0) continue;

        const alociranoCents = Math.min(preostaloCents, dugRacunaCents);
        const novoUplacenoCents = vecUplacenoCents + alociranoCents;
        const potpunoPlaceno = novoUplacenoCents >= racunCents;

        await client.query(
          `UPDATE racuni
           SET uplaceno = $1, placen = $2
           WHERE id = $3`,
          [centsToMoney(novoUplacenoCents), potpunoPlaceno, racun.id]
        );

        await client.query(
          `INSERT INTO alokacije_transakcija (transakcija_id, racun_id, iznos)
           VALUES ($1, $2, $3)`,
          [transakcijaId, racun.id, centsToMoney(alociranoCents)]
        );

        alokacije.push({
          racunId: racun.id,
          iznos: centsToMoney(alociranoCents),
        });

        preostaloCents -= alociranoCents;
      }

      if (preostaloCents !== 0) {
        throw new Error("Transakcija nije mogla biti u potpunosti raspoređena.");
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        transakcijaId,
        tip,
        iznos: centsToMoney(iznosCents),
        preostaliDug: centsToMoney(ukupanDugCents - iznosCents),
        alokacije,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Greška pri knjiženju transakcije:", error);

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
