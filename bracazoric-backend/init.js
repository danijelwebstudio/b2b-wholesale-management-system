const pool = require("./db");
const fs = require("fs");

async function inicijalizujBazu() {
  try {
    console.log("Čitam schema.sql fajl...");
    const sqlKomande = fs.readFileSync("./schema.sql", "utf-8");
    
    console.log("Šaljem tabele u PostgreSQL bazu...");
    await pool.query(sqlKomande);
    
    console.log("✅ Baza je USPJEŠNO ažurirana! Tabele su kreirane i korisnici su ubačeni.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Greška pri kreiranju tabela. Da li ti radi PostgreSQL i jesu li tačni podaci u .env fajlu?", err);
    process.exit(1);
  }
}

inicijalizujBazu();