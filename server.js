const express = require('express');
const path = require('path');

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

app.post("/api/signup", (req, res) => {

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "All fields are required"
    });
  }

  console.log("New user created:", name, email);

  res.json({
    message: "Account created successfully"
  });

});

// Login API endpoint
app.post("/api/login", (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password required"
    });
  }

  console.log("User logged in:", email);

  res.json({
    message: "Login successful",
    redirect: "/dashboard"
  });

});

// Summary API endpoint
app.post("/api/summary", (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      error: "Text is required for summary"
    });
  }

  // placeholder summary logic
  const summary = text.slice(0, 100) + "..."; // just first 100 chars for now

  console.log("Summary generated for text:", text);

  res.json({
    summary: summary
  });
});

// Quiz API endpoint
app.post("/api/quiz", (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({
      error: "Topic is required to generate quiz"
    });
  }

  // placeholder quiz logic.
  const quiz = [
    {
      question: `What is the main point of ${topic}?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      answer: "Option A"
    },
    {
      question: `Explain one key concept of ${topic}.`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      answer: "Option B"
    }
  ];

  console.log("Quiz generated for topic:", topic);

  res.json({ quiz });
});

// Explanation API endpoint
app.post("/api/explanation", (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({
      error: "Topic is required to generate explanation"
    });
  }


  // Placeholder explanation logic
  const explanation = `${topic} is an important concept that involves key ideas and examples for learning.`;

  console.log("Explanation generated for topic:", topic);

  res.json({ explanation });
});

app.listen(PORT, () => {
  console.log(`StudyMate running on http://localhost:${PORT}`);
});  
