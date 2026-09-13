const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const JWT_SECRET = process.env.JWT_SECRET || "elonuz-change-this-secret-2026";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, phone: user.phone },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Avval login qiling" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: "Login muddati tugagan" });
  }
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Foydalanuvchi',
      phone TEXT UNIQUE NOT NULL,
      password TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

    CREATE TABLE IF NOT EXISTS ads (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT,
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

    ALTER TABLE ads ADD COLUMN IF NOT EXISTS user_id BIGINT;

    CREATE TABLE IF NOT EXISTS favorites (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      ad_id BIGINT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, ad_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      ad_id BIGINT REFERENCES ads(id) ON DELETE CASCADE,
      sender TEXT,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM ads"
  );

  if (result.rows[0].count === 0) {
    await pool.query(`
      INSERT INTO ads
      (title, price, category, region, city, description, seller, phone, image)
      VALUES
      ('iPhone 13 128GB', 5500000, 'Telefonlar', 'Toshkent', 'Toshkent shahri', 'Yaxshi holatda. Komplekti bor.', 'Aziz', '+998901234567', '📱'),
      ('Samsung kir yuvish mashinasi', 2200000, 'Texnika', 'Samarqand', 'Samarqand', 'Ishlashi yaxshi va holati toza.', 'Dilshod', '+998912223344', '🧺'),
      ('Cobalt 2022', 145000000, 'Avtomobillar', 'Buxoro', 'Buxoro', 'Toza, avariyasiz avtomobil.', 'Jasur', '+998935556677', '🚗');
    `);
  }

  console.log("DATABASE TAYYOR");
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        error: "Ism, telefon va parol kerak"
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        error: "Parol kamida 4 ta belgidan iborat bo'lsin"
      });
    }

    const exists = await pool.query(
      "SELECT id FROM users WHERE phone=$1",
      [phone]
    );

    if (exists.rows.length) {
      return res.status(400).json({
        error: "Bu telefon raqami allaqachon ro'yxatdan o'tgan"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, phone, password)
       VALUES ($1,$2,$3)
       RETURNING id,name,phone,created_at`,
      [name, phone, hash]
    );

    const user = result.rows[0];

    res.json({
      user,
      token: createToken(user)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE phone=$1",
      [phone]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        error: "Telefon raqami yoki parol noto'g'ri"
      });
    }

    if (!user.password) {
      return res.status(401).json({
        error: "Bu eski akkaunt. Qaytadan ro'yxatdan o'ting."
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {
      return res.status(401).json({
        error: "Telefon raqami yoki parol noto'g'ri"
      });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      },
      token: createToken(user)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,name,phone,created_at
       FROM users WHERE id=$1`,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "Foydalanuvchi topilmadi"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/ads", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM ads ORDER BY created_at DESC"
    );

    res.json(result.rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/my-ads", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ads
       WHERE user_id=$1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ads", auth, async (req, res) => {
  try {
    const {
      title,
      price,
      category,
      region,
      city,
      description,
      image
    } = req.body;

    if (!title || !price) {
      return res.status(400).json({
        error: "Sarlavha va narx kerak"
      });
    }

    const result = await pool.query(
      `INSERT INTO ads
      (user_id,title,price,category,region,city,
       description,seller,phone,image)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        req.user.id,
        title,
        Number(price),
        category || "Boshqa",
        region || "",
        city || "",
        description || "",
        req.user.name,
        req.user.phone,
        image || "📦"
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/ads/:id", auth, async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT * FROM ads WHERE id=$1",
      [req.params.id]
    );

    const ad = check.rows[0];

    if (!ad) {
      return res.status(404).json({
        error: "E'lon topilmadi"
      });
    }

    if (String(ad.user_id) !== String(req.user.id)) {
      return res.status(403).json({
        error: "Siz faqat o'z e'loningizni tahrirlashingiz mumkin"
      });
    }

    const {
      title,
      price,
      category,
      region,
      city,
      description,
      image
    } = req.body;

    const result = await pool.query(
      `UPDATE ads SET
       title=$1,
       price=$2,
       category=$3,
       region=$4,
       city=$5,
       description=$6,
       image=$7
       WHERE id=$8
       RETURNING *`,
      [
        title,
        Number(price),
        category,
        region,
        city,
        description,
        image,
        req.params.id
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/ads/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM ads WHERE id=$1",
      [req.params.id]
    );

    const ad = result.rows[0];

    if (!ad) {
      return res.status(404).json({
        error: "E'lon topilmadi"
      });
    }

    if (String(ad.user_id) !== String(req.user.id)) {
      return res.status(403).json({
        error: "Siz faqat o'z e'loningizni o'chira olasiz"
      });
    }

    await pool.query(
      "DELETE FROM ads WHERE id=$1",
      [req.params.id]
    );

    res.json({ ok: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/favorites", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ads.*
       FROM favorites
       JOIN ads ON ads.id=favorites.ad_id
       WHERE favorites.user_id=$1
       ORDER BY favorites.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/favorites/:adId", auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO favorites (user_id,ad_id)
       VALUES ($1,$2)
       ON CONFLICT (user_id,ad_id) DO NOTHING`,
      [req.user.id, req.params.adId]
    );

    res.json({ ok: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/favorites/:adId", auth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM favorites
       WHERE user_id=$1 AND ad_id=$2`,
      [req.user.id, req.params.adId]
    );

    res.json({ ok: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.get(/.*/, (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

const PORT = process.env.PORT || 3000;

initDatabase()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log("E'LONUZ ISHGA TUSHDI:", PORT);
    });
  })
  .catch(error => {
    console.error("DATABASE XATOSI:", error.message);
    process.exit(1);
  });
