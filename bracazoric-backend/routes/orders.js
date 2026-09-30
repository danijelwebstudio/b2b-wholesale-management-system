const express = require("express");
const { randomUUID } = require("crypto");
const router = express.Router();
const pool = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

router.post(
  "/",
  authenticate,
  requireRole("trgovina"),
  async (req, res) => {
    const { proizvodi } = req.body;
    const trgovinaId = req.user.id;

    if (!Array.isArray(proizvodi) || proizvodi.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Narudžba mora imati barem jednu stavku.",
      });
    }

    for (const proizvod of proizvodi) {
      if (!proizvod || !String(proizvod.naziv || "").trim()) {
        return res.status(400).json({
          success: false,
          message: "Narudžba sadrži neispravnu stavku.",
        });
      }
    }

    const narudzbaId = randomUUID();
    const createdAt = new Date();
    const datum = createdAt.toISOString();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO narudzbe (id, trgovina_id, datum, status, created_at)
         VALUES ($1, $2, $3, 'Poslata', $4)`,
        [narudzbaId, trgovinaId, datum, createdAt]
      );

      for (const proizvod of proizvodi) {
        await client.query(
          `INSERT INTO stavke_narudzbe (narudzba_id, naziv, kolicina, jedinica)
           VALUES ($1, $2, $3, $4)`,
          [
            narudzbaId,
            String(proizvod.naziv).trim(),
            String(proizvod.kolicina ?? "1"),
            String(proizvod.jedinica ?? ""),
          ]
        );
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        narudzbaId,
        createdAt: createdAt.toISOString(),
        message: "Narudžba uspješno sačuvana.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Greška kod čuvanja narudžbe:", error);

      return res.status(500).json({
        success: false,
        message: "Greška na serveru.",
      });
    } finally {
      client.release();
    }
  }
);

router.get(
  "/",
  authenticate,
  requireRole("firma"),
  async (req, res) => {
    try {
      const narudzbeResult = await pool.query(`
        SELECT
          n.id,
          n.created_at AS "createdAt",
          TO_CHAR(n.created_at AT TIME ZONE 'Europe/Belgrade', 'DD. MM. YYYY. HH24:MI:SS') AS datum,
          n.status,
          k.naziv AS "trgovinaIme",
          k.id AS "trgovinaId"
        FROM narudzbe n
        JOIN korisnici k ON n.trgovina_id = k.id
        ORDER BY n.created_at DESC, n.id DESC
      `);

      const stavkeResult = await pool.query(
        `SELECT * FROM stavke_narudzbe ORDER BY id ASC`
      );

      const formatiraneNarudzbe = narudzbeResult.rows.map((narudzba) => ({
        ...narudzba,
        proizvodi: stavkeResult.rows.filter(
          (stavka) => stavka.narudzba_id === narudzba.id
        ),
      }));

      return res.json(formatiraneNarudzbe);
    } catch (error) {
      console.error("Greška kod dohvatanja narudžbi:", error);

      return res.status(500).json({
        success: false,
        message: "Greška na serveru.",
      });
    }
  }
);

module.exports = router;
