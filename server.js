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

app.post("/api/signup", async (req, res) => {

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "All fields are required"
    });
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert([{ name, email, password }])

  if (error) return res.status(500).json({ error })

  res.json({
    message: "Account created successfully", data
  });

});

// Login API endpoint
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .single()

  if (error || !data) {
    return res.status(401).json({ error: "Invalid credentials" })
    
  }

  res.json({
    message: "Login successful",
    user: data,
    redirect: "/dashboard"
  })
})

// Summary API endpoint
app.post("/api/summary", async (req, res) => {
  const { text } = req.body

  const summary = text.slice(0, 100) + "..."

  const { data, error } = await supabase
    .from('summaries')
    .insert([{ text, summary }])

  if (error) return res.status(500).json({ error })

  res.json({ summary, data })
})

// Quiz API endpoint
app.post("/api/quiz", async (req, res) => {
  const { topic } = req.body

  const quiz = [
    {
      question: `What is the main point of ${topic}?`,
      options: ["A", "B", "C", "D"],
      answer: "A"
    }
  ]

  const { data, error } = await supabase
    .from('quizzes')
    .insert([{ topic, quiz }])

  if (error) return res.status(500).json({ error })

  res.json({ quiz, data })
})

// Explanation API endpoint
app.post("/api/explanation", async (req, res) => {
  const { topic } = req.body

  const explanation = `${topic} is an important concept...`

  const { data, error } = await supabase
    .from('summaries')
    .insert([{ topic, explanation }])

  if (error) return res.status(500).json({ error })

  res.json({ explanation, data })
})

app.listen(PORT, () => {
  console.log(`StudyMate running on http://localhost:${PORT}`);
});  
