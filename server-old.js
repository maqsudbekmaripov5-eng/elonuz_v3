const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Foydalanuvchi',
      phone TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ads (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      price BIGINT NOT NULL DEFAULT 0,
      category TEXT,
      region TEXT,
      city TEXT,
      description TEXT,
      seller TEXT,
      phone TEXT,
      image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      ad_id BIGINT REFERENCES ads(id) ON DELETE CASCADE,
      sender TEXT,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM ads"
  );

  if (rows[0].count === 0) {
    await pool.query(`
      INSERT INTO ads
      (title, price, category, region, city, description, seller, phone, image)
      VALUES
      ('iPhone 13 128GB', 5500000, 'Telefonlar', 'Toshkent', 'Toshkent shahri', 'Yaxshi holatda. Komplekti bor.', 'Aziz', '+998901234567', '📱'),
      ('Samsung kir yuvish mashinasi', 2200000, 'Maishiy texnika', 'Samarqand', 'Samarqand', 'Ishlashi yaxshi va holati toza.', 'Dilshod', '+998912223344', '🧺'),
      ('Cobalt 2022', 145000000, 'Avtomobillar', 'Buxoro', 'Buxoro', 'Toza, avariyasiz avtomobil.', 'Jasur', '+998935556677', '🚗');
    `);
  }

  console.log("DATABASE TAYYOR!");
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(500).json({
      ok: false,
      database: "error",
      error: error.message
    });
  }
});

app.get("/api/ads", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM ads ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ads", async (req, res) => {
  try {
    const {
      title, price, category, region, city,
      description, seller, phone, image
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO ads
      (title, price, category, region, city, description, seller, phone, image)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [title, price || 0, category, region, city,
       description, seller, phone, image]
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/ads/:id", async (req, res) => {
  try {
    const {
      title, price, category, region, city,
      description, seller, phone, image
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE ads SET
        title=$1, price=$2, category=$3, region=$4,
        city=$5, description=$6, seller=$7,
        phone=$8, image=$9
       WHERE id=$10
       RETURNING *`,
      [title, price, category, region, city,
       description, seller, phone, image,
       req.params.id]
    );

    if (!rows[0])
      return res.status(404).json({ error: "Topilmadi" });

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/ads/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM ads WHERE id=$1",
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { phone, name } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO users (phone, name)
       VALUES ($1,$2)
       ON CONFLICT (phone)
       DO UPDATE SET name=EXCLUDED.name
       RETURNING *`,
      [phone, name || "Foydalanuvchi"]
    );

    res.json({
      user: rows[0],
      token: "local-demo-token"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/messages/:adId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM messages
       WHERE ad_id=$1
       ORDER BY created_at ASC`,
      [req.params.adId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { adId, sender, text } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO messages (ad_id, sender, text)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [adId, sender, text]
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

initDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log("================================");
      console.log(" E'LONUZ V3 + SUPABASE ISHGA TUSHDI");
      console.log(" PORT:", PORT);
      console.log("================================");
    });
  })
  .catch(error => {
    console.error("DATABASE XATOSI:", error.message);
    process.exit(1);
  });
