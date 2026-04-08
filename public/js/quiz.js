// quiz.js
const generateBtn = document.getElementById("generateQuizBtn");
const quizInput = document.getElementById("quizInput");
const quizResults = document.getElementById("quizResults");

let currentQuiz = [];

generateBtn.addEventListener("click", async () => {
  const notes = quizInput.value.trim();

  if (!notes) {
    alert("Please enter notes or a topic to generate a quiz");
    return;
  }

  quizResults.innerHTML = "<p>Generating quiz...</p>";

  try {
    const res = await fetch("/api/quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ note_text: notes })
    });

    const data = await res.json();

    if (data.error) {
      quizResults.innerHTML = `
        <p style="color:red;"><strong>Error:</strong> ${data.error}</p>
        <pre>${data.raw || ""}</pre>
      `;
      return;
    }

    currentQuiz = data.data;

    let html = "<form id='quizForm'><ol>";

    currentQuiz.forEach((q, index) => {
      html += `
        <li>
          <strong>${q.question}</strong><br>
          <input 
            type="text" 
            name="q${index}" 
            class="input" 
            placeholder="Your answer..."
            style="margin-top:8px;"
          >
        </li><br>
      `;
    });

    html += `
      </ol>
      <button type="submit" class="btn btn-primary">
        Submit Quiz
      </button>
      </form>

      <div id="scoreResult" style="margin-top:20px;"></div>
    `;

    quizResults.innerHTML = html;

    document.getElementById("quizForm").addEventListener("submit", (e) => {
      e.preventDefault();

      let score = 0;
      let resultHTML = "<h3>Results:</h3><ol>";

      currentQuiz.forEach((q, index) => {
        const userAnswer = e.target[`q${index}`].value.toLowerCase().trim();
        const correctAnswer = q.answer.toLowerCase().trim();

        const isCorrect =
          userAnswer !== "" &&
          (userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer));

        if (isCorrect) score++;

        resultHTML += `
          <li>
            <strong>${q.question}</strong><br>
            Your answer: ${userAnswer || "—"}<br>
            Correct answer: ${q.answer}<br>
            <span style="color:${isCorrect ? "green" : "red"};">
              ${isCorrect ? "Correct" : "Incorrect"}
            </span>
          </li><br>
        `;
      });

      resultHTML += `</ol>
        <h3>Score: ${score} / ${currentQuiz.length}</h3>
      `;

      document.getElementById("scoreResult").innerHTML = resultHTML;
    });

  } catch (err) {
    console.error(err);
    quizResults.innerHTML = "<p>Error generating quiz.</p>";
  }
});