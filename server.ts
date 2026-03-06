import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "irexihub-secret-key";

app.use(express.json());

// Multer setup for file uploads (Memory storage for Supabase)
const storage = multer.memoryStorage();
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
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from("academy_users")
    .select("*")
    .eq("username", username)
    .single();

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Courses
app.get("/api/courses", async (req, res) => {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("name");

  if (error) return res.status(500).json({ error: error.message });
  res.json(courses);
});

app.post("/api/courses", authenticateToken, async (req, res) => {
  const { code, name, description } = req.body;
  const { data, error } = await supabase
    .from("courses")
    .insert([{ code, name, description }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data.id });
});

app.delete("/api/courses/:id", authenticateToken, async (req, res) => {
  const { error: mError } = await supabase.from("materials").delete().eq("course_id", req.params.id);
  const { error: cError } = await supabase.from("courses").delete().eq("id", req.params.id);

  if (mError || cError) return res.status(500).json({ error: "Failed to delete course" });
  res.json({ success: true });
});

// Materials
app.get("/api/courses/:id/materials", async (req, res) => {
  const { data: materials, error } = await supabase
    .from("materials")
    .select("*")
    .eq("course_id", req.params.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(materials);
});

app.post("/api/materials", authenticateToken, upload.single("file"), async (req, res) => {
  const { course_id, title, type, url, description } = req.body;
  let fileUrl = url;

  if (req.file) {
    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const { data, error: uploadError } = await supabase.storage
      .from("academy-resources")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: { publicUrl } } = supabase.storage
      .from("academy-resources")
      .getPublicUrl(fileName);

    fileUrl = publicUrl;
  }

  const { data, error } = await supabase
    .from("materials")
    .insert([{ course_id, title, type, url: fileUrl, description }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

app.delete("/api/materials/:id", authenticateToken, async (req, res) => {
  const { data: material } = await supabase
    .from("materials")
    .select("url")
    .eq("id", req.params.id)
    .single();

  if (material && material.url.includes("academy-resources")) {
    const fileName = material.url.split("/").pop();
    if (fileName) {
      await supabase.storage.from("academy-resources").remove([fileName]);
    }
  }

  const { error } = await supabase.from("materials").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Search
app.get("/api/search", async (req, res) => {
  const query = req.query.q as string;
  const { data, error } = await supabase
    .from("materials")
    .select(`
      *,
      courses (name, code)
    `)
    .or(`title.ilike.%${query}%, description.ilike.%${query}%`);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// AI Features
let genAI: GoogleGenAI | null = null;
function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAI;
}

app.post("/api/ai/summarize", async (req, res) => {
  const { text } = req.body;
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

  try {
    const prompt = `Summarize the following academic material description in 3 concise bullet points. Focus on key learning outcomes:\n\n${text}`;
    const result = await getGenAI()!.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ summary: result.text });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/ai/suggest-title", async (req, res) => {
  const { description } = req.body;
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API key not configured" });

  try {
    const prompt = `Based on this description, suggest a clear, academic title for this study resource. Return ONLY the title:\n\n${description}`;
    const result = await getGenAI()!.models.generateContent({ model: "gemini-2.0-flash", contents: prompt });
    res.json({ title: (result.text || "").trim() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
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

  // Only listen locally, Vercel handles the export
  if (process.env.VITE_DEV === "true" || process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
