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

// Gemini init
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// helper pages
const sendPage = (page) => (req, res) => {
  res.sendFile(path.join(__dirname, 'public', page));
};

// pages
app.get('/', sendPage('index.html'));
app.get('/signup', sendPage('signup.html'));
app.get('/login', sendPage('login.html'));
app.get('/dashboard', sendPage('dashboard.html'));
app.get('/dashboard/upload', sendPage('upload.html'));
app.get('/dashboard/quiz', sendPage('quiz.html'));
app.get('/dashboard/explain', sendPage('explain.html'));
app.get('/dashboard/progress', sendPage('progress.html'));
app.get('/dashboard/profile', sendPage('profile.html'));

// ---------------- NOTES ----------------

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

// ---------------- AUTH ----------------

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

  res.json({
    message: "Login successful",
    user: safeUser,
    redirect: "/dashboard"
  });
});

// ---------------- SUMMARY ----------------
app.post('/api/summary', async (req, res) => {
  try {
    const { text, user_id, note_id } = req.body;

    if (!text) {
      return res.status(400).json({ error: "No text provided" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(
      `Summarize this text in simple words:\n\n${text}`
    );

    const summary = result.response.text();

    
    if (note_id) {
      const { error } = await supabase.from("summaries").insert([
        {
          note_id,
          summary_text: summary
        }
      ]);

      if (error) console.log("summary insert error:", error);
    }

    res.json({ summary });

  } catch (err) {
    res.status(500).json({
      error: "Summary generation failed",
      details: err.message
    });
  }
});

// ---------------- QUIZ ----------------

app.post("/api/quiz", async (req, res) => {
  try {
    const { note_text, note_id } = req.body;

    if (!note_text) {
      return res.status(400).json({ error: "No notes provided" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
Generate exactly 5 quiz questions with answers.

Return ONLY valid JSON:
[
  {"question": "string", "answer": "string"}
]

Notes:
${note_text}
`;

    const result = await model.generateContent(prompt);

    let text = result.response.text();

    // safer cleanup
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let quizData;

    try {
      quizData = JSON.parse(text);
    } catch (err) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      quizData = JSON.parse(text);
    }

    // optional DB save
    if (note_id) {
      const formatted = quizData.map(q => ({
        note_id,
        question: q.question,
        answer: q.answer
      }));

      await supabase.from("quizzes").insert(formatted);
    }

    res.json({ data: quizData });

  } catch (err) {
    res.status(500).json({
      error: "Quiz generation failed",
      details: err.message
    });
  }
});

// ---------------- EXPLANATION ----------------

app.post("/api/explanation", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) return res.status(400).json({ error: "Topic is required" });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(
      `Explain this topic in simple terms:\n\n${topic}`
    );

    res.json({ explanation: result.response.text() });

  } catch (err) {
    res.status(500).json({
      error: "Explanation failed",
      details: err.message
    });
  }
});

// ---------------- QUIZ SUBMIT + PROGRESS ----------------

app.post("/api/quiz/submit", async (req, res) => {
  const { user_id, topic, answers } = req.body;

  if (!user_id || !answers) {
    return res.status(400).json({ error: "Missing fields" });
  }

  let correct = 0;

  answers.forEach(a => {
    if (a.user_answer === a.correct_answer) correct++;
  });

  const score = Math.round((correct / answers.length) * 100);

  const { data, error } = await supabase
    .from("progress")
    .upsert([
      {
        user_id,
        topic: topic || "General",
        score,
        status: "completed",
        updated_at: new Date().toISOString()
      }
    ])
    .select();

  if (error) return res.status(500).json({ error });

  res.json({
    score,
    correct,
    total: answers.length,
    progress: data
  });
});

// ---------------- PROGRESS FETCH ----------------

app.get("/api/progress/:user_id", async (req, res) => {
  const { user_id } = req.params;

  const { data, error } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", user_id);

  if (error) return res.status(500).json({ error });

  const totalTopics = data?.length || 0;

  const avgScore = totalTopics
    ? data.reduce((acc, item) => acc + (item.score || 0), 0) / totalTopics
    : 0;

  res.json({
    totalTopics,
    avgScore,
    progress: data
  });
});

app.get("/api/stats/:user_id", async (req, res) => {
  const { user_id } = req.params;

  // get notes first (bridge)
  const { data: notes } = await supabase
    .from("notes")
    .select("id")
    .eq("user_id", user_id);

  const noteIds = notes?.map(n => n.id) || [];

  // summaries linked via notes
  const { data: summaries } = await supabase
    .from("summaries")
    .select("*")
    .in("note_id", noteIds);

  // quiz attempts
  const { data: progress } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", user_id);

  const totalSummaries = summaries?.length || 0;
  const quizzesTaken = progress?.length || 0;

  const avgScore = quizzesTaken
    ? progress.reduce((sum, q) => sum + (q.score || 0), 0) / quizzesTaken
    : 0;

  res.json({
    totalSummaries,
    quizzesTaken,
    avgScore: Math.round(avgScore)
  });
});

// ---------------- START SERVER ----------------

app.listen(PORT, () => {
  console.log(`StudyMate running on http://localhost:${PORT}`);
});