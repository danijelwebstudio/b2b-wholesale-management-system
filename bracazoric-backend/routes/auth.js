const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Unesite korisničko ime i lozinku.",
      });
    }

    const result = await pool.query(
      `SELECT id, username, password_hash, role, naziv AS name
       FROM korisnici
       WHERE username = $1
       LIMIT 1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Pogrešno korisničko ime ili lozinka.",
      });
    }

    const dbUser = result.rows[0];
    const passwordIsValid = await bcrypt.compare(password, dbUser.password_hash);

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Pogrešno korisničko ime ili lozinka.",
      });
    }

    const user = {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      name: dbUser.name,
    };

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    return res.json({ success: true, token, user });
  } catch (error) {
    console.error("Greška pri loginu:", error);
    return res.status(500).json({
      success: false,
      message: "Greška na serveru.",
    });
  }
});

router.get(
  "/trgovine",
  authenticate,
  requireRole("firma"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, naziv AS name
         FROM korisnici
         WHERE role = 'trgovina'
         ORDER BY naziv ASC`
      );

      return res.json(result.rows);
    } catch (error) {
      console.error("Greška pri dohvatanju trgovina:", error);
      return res.status(500).json({
        success: false,
        message: "Greška na serveru.",
      });
    }
  }
);

module.exports = router;
