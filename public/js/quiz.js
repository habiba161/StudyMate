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

    if (!res.ok || data.error) {
      quizResults.innerHTML = `
        <p style="color:red;"><strong>Error:</strong> ${data.error || "Failed to generate quiz"}</p>
        <pre>${data.raw || ""}</pre>
      `;
      return;
    }

    currentQuiz = data.data || [];

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

    document.getElementById("quizForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const userId = localStorage.getItem("user_id");

      if (!userId) {
        alert("User not logged in. Please login first.");
        return;
      }

      const answers = currentQuiz.map((q, index) => {
        const userAnswer = e.target[`q${index}`].value.trim();

        return {
          question: q.question,
          correct_answer: q.answer,
          user_answer: userAnswer
        };
      });

      try {
        const submitRes = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            user_id: Number(userId),
            topic: notes,
            answers
          })
        });

        const submitData = await submitRes.json();

        if (!submitRes.ok || submitData.error) {
          document.getElementById("scoreResult").innerHTML = `
            <p style="color:red;">${submitData.error || "Failed to submit quiz"}</p>
          `;
          return;
        }

        let resultHTML = "<h3>Results:</h3><ol>";

        answers.forEach((item, index) => {
          const userAnswer = item.user_answer.toLowerCase().trim();
          const correctAnswer = item.correct_answer.toLowerCase().trim();

          const isCorrect =
            userAnswer !== "" &&
            (userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer));

          resultHTML += `
            <li>
              <strong>${item.question}</strong><br>
              Your answer: ${item.user_answer || "—"}<br>
              Correct answer: ${item.correct_answer}<br>
              <span style="color:${isCorrect ? "green" : "red"};">
                ${isCorrect ? "Correct" : "Incorrect"}
              </span>
            </li><br>
          `;
        });

        resultHTML += `
          </ol>
          <h3>Score: ${submitData.score} / ${submitData.total_questions}</h3>
          <p>Percentage: ${submitData.percentage}%</p>
        `;

        document.getElementById("scoreResult").innerHTML = resultHTML;

        setTimeout(() => {
          window.location.href = "/dashboard/progress";
        }, 2000);

      } catch (err) {
        console.error(err);
        document.getElementById("scoreResult").innerHTML = `
          <p style="color:red;">Error submitting quiz.</p>
        `;
      }
    });

  } catch (err) {
    console.error(err);
    quizResults.innerHTML = "<p>Error generating quiz.</p>";
  }
});