require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('./lib/supabaseClient');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// -------------------- Helper --------------------
const sendPage = (page) => (req, res) => {
  res.sendFile(path.join(__dirname, 'public', page));
};

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

// -------------------- Pages --------------------
app.get('/', sendPage('index.html'));
app.get('/signup', sendPage('signup.html'));
app.get('/login', sendPage('login.html'));
app.get('/dashboard', sendPage('dashboard.html'));
app.get('/dashboard/upload', sendPage('upload.html'));
app.get('/dashboard/quiz', sendPage('quiz.html'));
app.get('/dashboard/explain', sendPage('explain.html'));
app.get('/dashboard/progress', sendPage('progress.html'));
app.get('/dashboard/profile', sendPage('profile.html'));

// -------------------- Notes --------------------
app.get('/api/notes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('notes').select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { user_id, content } = req.body;

    if (!user_id || !content) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const { data, error } = await supabase
      .from('notes')
      .insert([{ user_id, content }])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Note saved successfully', data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// -------------------- Auth --------------------
app.post('/api/signup', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('profiles')
      .insert([{ full_name, email, password_hash }])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email already in use' });
      }
      return res.status(500).json({ error: 'Something went wrong' });
    }

    const safeData = data.map(({ password_hash, ...rest }) => rest);

    res.json({
      message: 'Account created',
      data: safeData
    });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, data.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password_hash, ...safeUser } = data;

    res.json({
      message: 'Login successful',
      user: safeUser,
      redirect: '/dashboard'
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// -------------------- Summary --------------------
app.post('/api/summary', async (req, res) => {
  try {
    const { text, note_id } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(
      `Summarize this text in simple words:\n\n${text}`
    );

    const summary = result.response.text();

    if (note_id) {
      const { error } = await supabase.from('summaries').insert([
        {
          note_id,
          summary_text: summary
        }
      ]);

      if (error) {
        console.log('summary insert error:', error.message);
      }
    }

    res.json({ summary });
  } catch (err) {
    res.status(500).json({
      error: 'Summary generation failed',
      details: err.message
    });
  }
});

// -------------------- Quiz Generate --------------------
app.post('/api/quiz', async (req, res) => {
  try {
    const { note_text, note_id } = req.body;

    if (!note_text) {
      return res.status(400).json({ error: 'No notes provided' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let quizData;

    try {
      quizData = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({
        error: 'Quiz generation returned invalid JSON',
        raw: text
      });
    }

    if (note_id) {
      const formatted = quizData.map((q) => ({
        note_id,
        question: q.question,
        answer: q.answer
      }));

      const { error } = await supabase.from('quizzes').insert(formatted);

      if (error) {
        console.log('quiz insert error:', error.message);
      }
    }

    res.json({ data: quizData });
  } catch (err) {
    res.status(500).json({
      error: 'Quiz generation failed',
      details: err.message
    });
  }
});

// -------------------- Explanation --------------------
app.post('/api/explanation', async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(
      `Explain this topic in simple terms:\n\n${topic}`
    );

    res.json({ explanation: result.response.text() });
  } catch (err) {
    res.status(500).json({
      error: 'Explanation failed',
      details: err.message
    });
  }
});

// -------------------- Quiz Submit --------------------
app.post('/api/quiz/submit', async (req, res) => {
  try {
    const { user_id, topic, answers } = req.body;

    if (!user_id || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let correct = 0;

    answers.forEach((item) => {
      const userAnswer = normalizeText(item.user_answer);
      const correctAnswer = normalizeText(item.correct_answer);

      const isCorrect =
        userAnswer !== '' &&
        (userAnswer === correctAnswer ||
          userAnswer.includes(correctAnswer) ||
          correctAnswer.includes(userAnswer));

      if (isCorrect) {
        correct++;
      }
    });

    const total_questions = answers.length;
    const percentage =
      total_questions > 0 ? Math.round((correct / total_questions) * 100) : 0;

    const { data, error } = await supabase
      .from('progress')
      .insert([
        {
          user_id,
          topic: topic || 'General',
          score: percentage,
          total_questions,
          correct_answers: correct,
          status: 'completed',
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Quiz submitted successfully',
      score: percentage,
      correct,
      total_questions,
      percentage,
      data
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// -------------------- Progress --------------------
app.get('/api/progress/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// -------------------- Dashboard Stats --------------------
app.get('/api/stats/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: progress, error } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const records = progress || [];
    const totalQuizzes = records.length;

    const averageScore = totalQuizzes
      ? Math.round(
          records.reduce((sum, item) => sum + (item.score || 0), 0) / totalQuizzes
        )
      : 0;

    const bestScore = totalQuizzes
      ? Math.max(...records.map((item) => item.score || 0))
      : 0;

    const topicsCount = new Set(records.map((item) => item.topic)).size;

    res.json({
      totalQuizzes,
      averageScore,
      bestScore,
      topicsCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// -------------------- Health --------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// -------------------- Start Server --------------------
app.listen(PORT, () => {
  console.log(`StudyMate running on http://localhost:${PORT}`);
});