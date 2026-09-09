const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret";

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ================================
   TEMPORARY DATABASE
   PostgreSQL keyingi qadamda ulanadi
================================ */

let users = [];
let ads = [
  {
    id: 1,
    title: "iPhone 13 128GB",
    price: 5500000,
    category: "Telefonlar",
    region: "Toshkent",
    city: "Toshkent shahri",
    description: "Yaxshi holatda. Komplekti bor.",
    image: "📱",
    seller: "Demo foydalanuvchi",
    phone: "+998901234567",
    userId: 1,
    date: Date.now()
  }
];

let messages = [];


/* ================================
   HEALTH CHECK
================================ */

app.get("/", (req, res) => {
  res.json({
    app: "E'lonUz v3",
    status: "online"
  });
});


/* ================================
   REGISTER
================================ */

app.post("/api/auth/register", async (req, res) => {

  try {

    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        error: "Barcha maydonlarni to'ldiring"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error:
          "Parol kamida 6 ta belgidan iborat bo'lishi kerak"
      });
    }

    const exists =
      users.find(
        user => user.phone === phone
      );

    if (exists) {
      return res.status(400).json({
        error:
          "Bu telefon raqami allaqachon ro'yxatdan o'tgan"
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user = {
      id: Date.now(),
      name,
      phone,
      password: hashedPassword,
      createdAt: Date.now()
    };

    users.push(user);

    const token = jwt.sign(
      {
        id: user.id,
        phone: user.phone
      },
      JWT_SECRET,
      {
        expiresIn: "30d"
      }
    );

    res.status(201).json({
      message:
        "Ro'yxatdan o'tish muvaffaqiyatli",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      }
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server xatosi"
    });
  }
});


/* ================================
   LOGIN
================================ */

app.post("/api/auth/login", async (req, res) => {

  try {

    const { phone, password } = req.body;

    const user =
      users.find(
        user => user.phone === phone
      );

    if (!user) {
      return res.status(401).json({
        error:
          "Telefon raqami yoki parol noto'g'ri"
      });
    }

    const passwordOk =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordOk) {
      return res.status(401).json({
        error:
          "Telefon raqami yoki parol noto'g'ri"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        phone: user.phone
      },
      JWT_SECRET,
      {
        expiresIn: "30d"
      }
    );

    res.json({
      message: "Kirish muvaffaqiyatli",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone
      }
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server xatosi"
    });
  }
});


/* ================================
   AUTH MIDDLEWARE
================================ */

function auth(req, res, next) {

  const header =
    req.headers.authorization;

  if (!header) {
    return res.status(401).json({
      error: "Token topilmadi"
    });
  }

  const token =
    header.replace("Bearer ", "");

  try {

    req.user =
      jwt.verify(
        token,
        JWT_SECRET
      );

    next();

  } catch (error) {

    res.status(401).json({
      error:
        "Token noto'g'ri yoki eskirgan"
    });
  }
}


/* ================================
   GET ADS
================================ */

app.get("/api/ads", (req, res) => {

  res.json(ads);

});


/* ================================
   CREATE AD
================================ */

app.post(
  "/api/ads",
  auth,
  (req, res) => {

    const {
      title,
      price,
      category,
      region,
      city,
      description,
      image
    } = req.body;

    if (
      !title ||
      !price ||
      !category
    ) {

      return res.status(400).json({
        error:
          "Majburiy maydonlarni to'ldiring"
      });
    }

    const user =
      users.find(
        item =>
          item.id === req.user.id
      );

    const ad = {

      id: Date.now(),

      title,
      price: Number(price),

      category,

      region:
        region || "",

      city:
        city || "",

      description:
        description || "",

      image:
        image || "📦",

      seller:
        user ? user.name : "Foydalanuvchi",

      phone:
        user ? user.phone : "",

      userId:
        req.user.id,

      date:
        Date.now()

    };

    ads.unshift(ad);

    res.status(201).json(ad);

  }
);


/* ================================
   DELETE AD
================================ */

app.delete(
  "/api/ads/:id",
  auth,
  (req, res) => {

    const id =
      Number(req.params.id);

    const index =
      ads.findIndex(
        ad => ad.id === id
      );

    if (index === -1) {

      return res.status(404).json({
        error:
          "E'lon topilmadi"
      });
    }

    if (
      ads[index].userId !==
      req.user.id
    ) {

      return res.status(403).json({
        error:
          "Bu e'lon sizga tegishli emas"
      });
    }

    ads.splice(index, 1);

    res.json({
      message:
        "E'lon o'chirildi"
    });

  }
);


/* ================================
   SERVER
================================ */

app.listen(PORT, "0.0.0.0", () => {

  console.log("");
  console.log("==============================");
  console.log("   E'LONUZ V3 API ISHGA TUSHDI");
  console.log("==============================");
  console.log(
    "http://127.0.0.1:" + PORT
  );
  console.log("");

});
