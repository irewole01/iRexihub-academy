import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("irexihub.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER,
    title TEXT,
    type TEXT, -- 'pdf', 'audio', 'video', 'practical', 'note'
    url TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(course_id) REFERENCES courses(id)
  );
`);

// Seed admin user if not exists
const admin = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!admin) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("admin", hashedPassword);
}

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "irexihub-secret-key";

app.use(express.json());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Auth
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Courses
app.get("/api/courses", (req, res) => {
  const courses = db.prepare("SELECT * FROM courses").all();
  res.json(courses);
});

app.post("/api/courses", authenticateToken, (req, res) => {
  const { code, name, description } = req.body;
  try {
    const result = db.prepare("INSERT INTO courses (code, name, description) VALUES (?, ?, ?)").run(code, name, description);
    res.json({ id: result.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/api/courses/:id", authenticateToken, (req, res) => {
  db.prepare("DELETE FROM materials WHERE course_id = ?").run(req.params.id);
  db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Materials
app.get("/api/courses/:id/materials", (req, res) => {
  const materials = db.prepare("SELECT * FROM materials WHERE course_id = ? ORDER BY created_at DESC").all(req.params.id);
  res.json(materials);
});

app.post("/api/materials", authenticateToken, upload.single("file"), (req, res) => {
  const { course_id, title, type, url, description } = req.body;
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : url;
  
  const result = db.prepare("INSERT INTO materials (course_id, title, type, url, description) VALUES (?, ?, ?, ?, ?)")
    .run(course_id, title, type, fileUrl, description);
  
  res.json({ id: result.lastInsertRowid });
});

app.delete("/api/materials/:id", authenticateToken, (req, res) => {
  const material: any = db.prepare("SELECT url FROM materials WHERE id = ?").get(req.params.id);
  if (material && material.url.startsWith("/uploads/")) {
    const filePath = path.join(__dirname, material.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare("DELETE FROM materials WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Static files for uploads
app.use("/uploads", express.static(uploadsDir));

// Search
app.get("/api/search", (req, res) => {
  const query = req.query.q;
  const materials = db.prepare(`
    SELECT m.*, c.name as course_name, c.code as course_code 
    FROM materials m 
    JOIN courses c ON m.course_id = c.id 
    WHERE m.title LIKE ? OR c.name LIKE ? OR c.code LIKE ? OR m.description LIKE ?
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
  res.json(materials);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
