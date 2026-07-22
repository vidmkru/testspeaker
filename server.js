import "dotenv/config";
import express from "express";
import session from "express-session";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  getAllSpeakers,
  getSpeakerById,
  addSpeaker,
  updateSpeaker,
  deleteSpeaker,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-in-.env";
const PORT = process.env.PORT || 3000;

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 },
  })
);

// --- File upload setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
      file.mimetype
    );
    cb(ok ? null : new Error("Разрешены только изображения (jpg, png, webp, gif)"), ok);
  },
});

// --- Auth helpers ---
function requireAuth(req, res, next) {
  if (req.session.isAdmin) return next();
  return res.redirect("/admin/login");
}

// --- Public routes ---
app.get("/", (req, res) => {
  const speakers = getAllSpeakers().sort((a, b) =>
    a.name.localeCompare(b.name, "ru")
  );
  res.render("index", { speakers });
});

app.get("/health", (req, res) => res.json({ ok: true }));

// --- Admin auth routes ---
app.get("/admin/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }
  res.render("login", { error: "Неверный пароль" });
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// --- Admin panel routes ---
app.get("/admin", requireAuth, (req, res) => {
  const speakers = getAllSpeakers().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.render("admin", { speakers });
});

app.get("/admin/new", requireAuth, (req, res) => {
  res.render("form", { speaker: null, error: null });
});

app.post("/admin/new", requireAuth, (req, res) => {
  upload.single("photo")(req, res, (err) => {
    if (err) return res.render("form", { speaker: null, error: err.message });
    const { name, title, bio } = req.body;
    if (!name || !req.file) {
      return res.render("form", {
        speaker: null,
        error: "Укажите имя и загрузите фото",
      });
    }
    addSpeaker({
      name,
      title,
      bio,
      photo: "/uploads/" + req.file.filename,
    });
    res.redirect("/admin");
  });
});

app.get("/admin/edit/:id", requireAuth, (req, res) => {
  const speaker = getSpeakerById(req.params.id);
  if (!speaker) return res.redirect("/admin");
  res.render("form", { speaker, error: null });
});

app.post("/admin/edit/:id", requireAuth, (req, res) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      const speaker = getSpeakerById(req.params.id);
      return res.render("form", { speaker, error: err.message });
    }
    const { name, title, bio } = req.body;
    const photo = req.file ? "/uploads/" + req.file.filename : undefined;
    updateSpeaker(req.params.id, { name, title, bio, photo });
    res.redirect("/admin");
  });
});

app.post("/admin/delete/:id", requireAuth, (req, res) => {
  deleteSpeaker(req.params.id);
  res.redirect("/admin");
});

app.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);
  console.log(`Админка: http://localhost:${PORT}/admin/login`);
});
