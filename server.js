require('dotenv').config();
const express = require('express');
const path = require('path');
const supabase = require('./lib/supabaseClient');
const bcrypt = require('bcrypt');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Helper to serve HTML pages
const sendPage = (page) => (req, res) => {
  res.sendFile(path.join(__dirname, 'public', page));
};

// --- Routes for pages ---
app.get('/', sendPage('index.html'));
app.get('/signup', sendPage('signup.html'));
app.get('/login', sendPage('login.html'));
app.get('/dashboard', sendPage('dashboard.html'));
app.get('/dashboard/upload', sendPage('upload.html'));
app.get('/dashboard/quiz', sendPage('quiz.html'));
app.get('/dashboard/explain', sendPage('explain.html'));
app.get('/dashboard/progress', sendPage('progress.html'));
app.get('/dashboard/profile', sendPage('profile.html'));

// --- API Endpoints ---

// Notes
app.get("/api/notes", async (req, res) => {
  const { data, error } = await supabase.from('notes').select('*');
  if (error) return res.status(500).json({ error });
  res.json({ data });
});

app.post("/api/notes", async (req, res) => {
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: "Missing fields" });

  const { data, error } = await supabase
    .from('notes')
    .insert([{ user_id, content }])
    .select();

  if (error) return res.status(500).json({ error });
  res.json({ data });
});

// Signup
app.post("/api/signup", async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) return res.status(400).json({ error: "Missing fields" });

  const password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ full_name, email, password_hash }])
    .select();

  if (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Email already in use" });
    return res.status(500).json({ error: "Something went wrong" });
  }

  const safeData = data.map(({ password_hash, ...rest }) => rest);
  res.json({ message: "Account created", data: safeData });
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return res.status(401).json({ error: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, data.password_hash);
  if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

  const { password_hash, ...safeUser } = data;
  res.json({ message: "Login successful", user: safeUser, redirect: "/dashboard" });
});

// -------------------- Gemini Summary --------------------
app.post('/api/summary', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const result = await model.generateContent(
      `Summarize this text in simple words:\n\n${text}`
    );

    const summary = result.response.text();

    res.json({ summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Summary generation failed",
      details: err.message
    });
  }
});
// --------------------------------------------------------

// Quiz
app.post("/api/quiz", async (req, res) => {
  const { note_id, question, answer } = req.body;
  if (!note_id || !question || !answer) return res.status(400).json({ error: "Missing fields" });

  const { data, error } = await supabase
    .from('quizzes')
    .insert([{ note_id, question, answer }])
    .select();
  if (error) return res.status(500).json({ error });
  res.json({ data });
});

// Explanation (dummy)
app.post("/api/explanation", async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });

  const explanation = `${topic} is an important concept...`;
  res.json({ explanation });
});

app.listen(PORT, () => {
  console.log(`StudyMate running on http://localhost:${PORT}`);
});
