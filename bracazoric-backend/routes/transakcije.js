const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();
const pool = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const {
  allocatePayment,
  PaymentAllocationError,
} = require("../services/paymentAllocator");

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
      return res.status(500).json({
        success: false,
        message: "Greška na serveru.",
      });
    }
  }
);

router.post(
  "/primijeni",
  authenticate,
  requireRole("firma"),
  async (req, res) => {
    const { trgovinaId, tip, iznos, opis } = req.body;

    if (!trgovinaId || !["UPLATA", "AMBALAZA"].includes(tip)) {
      return res.status(400).json({
        success: false,
        message: "Podaci transakcije nisu ispravni.",
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

      const plan = allocatePayment(racuniResult.rows, iznos);
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
          plan.paymentAmount,
          opis || (tip === "UPLATA" ? "Uplata gotovine" : "Povrat ambalaže"),
          datum,
          createdAt,
        ]
      );

      for (const allocation of plan.allocations) {
        await client.query(
          `UPDATE racuni
           SET uplaceno = $1, placen = $2
           WHERE id = $3`,
          [allocation.newPaidAmount, allocation.fullyPaid, allocation.racunId]
        );

        await client.query(
          `INSERT INTO alokacije_transakcija (transakcija_id, racun_id, iznos)
           VALUES ($1, $2, $3)`,
          [transakcijaId, allocation.racunId, allocation.allocatedAmount]
        );
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        transakcijaId,
        tip,
        iznos: plan.paymentAmount,
        preostaliDug: plan.remainingDebtAmount,
        alokacije: plan.allocations.map((allocation) => ({
          racunId: allocation.racunId,
          iznos: allocation.allocatedAmount,
        })),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Greška pri knjiženju transakcije:", error);

      const knownError =
        error instanceof PaymentAllocationError || error.status;

      return res.status(error.status || 500).json({
        success: false,
        message: knownError ? error.message : "Greška na serveru.",
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
