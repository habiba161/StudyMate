require('dotenv').config();
const express = require('express');
const path = require('path');
const supabase = require('./lib/supabaseClient')
const app = express();

const PORT = process.env.PORT || 3000;
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const sendPage = (page) => (req, res) => {
  res.sendFile(path.join(__dirname, 'public', page));
};

app.get('/', sendPage('index.html'));
app.get('/signup', sendPage('signup.html'));
app.get('/login', sendPage('login.html'));
app.get('/dashboard', sendPage('dashboard.html'));
app.get('/dashboard/upload', sendPage('upload.html'));
app.get('/dashboard/quiz', sendPage('quiz.html'));
app.get('/dashboard/explain', sendPage('explain.html'));
app.get('/dashboard/progress', sendPage('progress.html'));
app.get('/dashboard/profile', sendPage('profile.html'));

app.get("/api/notes", async (req, res) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')

  if (error) return res.status(500).json({ error })

  res.json({ data })
})

app.post("/api/notes", async (req, res) => {
  const { user_id, content } = req.body

  if (!user_id || !content) {
    return res.status(400).json({ error: "Missing fields" })
  }

  const { data, error } = await supabase
    .from('notes')
    .insert([{ user_id, content }])
    .select()

  if (error) return res.status(500).json({ error })

  res.json({ data })
})
app.post("/api/signup", async (req, res) => {
  const { full_name, email } = req.body

  if (!full_name || !email) {
    return res.status(400).json({ error: "Missing fields" })
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert([{ full_name, email }])
    .select()   // 🔥 THIS IS THE FIX

  if (error) return res.status(500).json({ error })

  res.json({
    message: "Account created",
    data
  })
})

// Login API endpoint
app.post("/api/login", async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ error: "Email is required" })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single()

  if (error || !data) {
    return res.status(401).json({ error: "User not found" })
  }

  res.json({
    message: "Login successful",
    user: data,
    redirect: "/dashboard"
  })
})

// Summary API endpoint
app.post("/api/summary", async (req, res) => {
  const { note_id, summary_text } = req.body

  if (!note_id || !summary_text) {
    return res.status(400).json({ error: "Missing fields" })
  }

  const { data, error } = await supabase
    .from('summaries')
    .insert([{ note_id, summary_text }])
    .select()

  if (error) return res.status(500).json({ error })

  res.json({ data })
})

// Quiz API endpoint
app.post("/api/quiz", async (req, res) => {
  const { note_id, question, answer } = req.body

  if (!note_id || !question || !answer) {
    return res.status(400).json({ error: "Missing fields" })
  }

  const { data, error } = await supabase
    .from('quizzes')
    .insert([{ note_id, question, answer }])
    .select()

  if (error) return res.status(500).json({ error })

  res.json({ data })
})

// Explanation API endpoint
app.post("/api/explanation", async (req, res) => {
  const { topic } = req.body
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" })
  }
  const explanation = `${topic} is an important concept...`

  res.json({ explanation })
})

app.listen(PORT, () => {
  console.log(`StudyMate running on http://localhost:${PORT}`);
});  
