const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");
const racuniRoutes = require("./routes/racuni");
const transakcijeRoutes = require("./routes/transakcije");


if (!process.env.JWT_SECRET) {
  console.error(
    "❌ Nedostaje JWT_SECRET u .env fajlu."
  );

  process.exit(1);
}


const app = express();


app.use(cors());

app.use(
  express.json({
    limit: "1mb",
  })
);


// =========================================================
// HEALTH CHECK
// =========================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
  });
});


// =========================================================
// ROUTES
// =========================================================

// Login je trenutno javna ruta.
// /auth/trgovine zaključavamo u sljedećem paketu.

app.use("/api/auth", authRoutes);


// OVE RUTE SU PRIVREMENO JOŠ OTVORENE.
//
// Kada frontend API pozivi budu slali JWT,
// ovdje uključujemo authenticate middleware.

app.use("/api/orders", ordersRoutes);

app.use("/api/racuni", racuniRoutes);

app.use(
  "/api/transakcije",
  transakcijeRoutes
);


// =========================================================
// 404
// =========================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta ne postoji.",
  });
});


// =========================================================
// SERVER
// =========================================================

const PORT = Number(
  process.env.PORT || 5000
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `✅ Server radi na portu ${PORT}`
  );
});