const generateBtn = document.getElementById("generateQuizBtn");
const quizInput = document.getElementById("quizInput");
const quizResults = document.getElementById("quizResults");

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

    if (data.data && data.data.length > 0) {
      let html = "<ol>";

      data.data.forEach((q) => {
        html += `
          <li>
            <strong>${q.question}</strong><br>
            Answer: ${q.answer}
          </li>
        `;
      });

      html += "</ol>";
      quizResults.innerHTML = html;

    } else {
      quizResults.innerHTML = `
        <p>No quiz generated.</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      `;
    }

  } catch (err) {
    console.error(err);
    quizResults.innerHTML = "<p>Error generating quiz.</p>";
  }
});