# StudyMate Frontend

Frontend implementation for StudyMate using HTML, CSS, JavaScript, and Node.js (Express).

## Pages Included
- Landing page
- Sign up
- Login
- Dashboard
- Upload notes
- Quiz
- Explanation
- Progress
- Profile

## Run StudyMate using Docker

Build the image:
docker build -t studymate-app .

Run the container:
docker run -p 5050:3000 studymate-app

Open in browser:
http://localhost:5050

## 🚀 Live Application
https://studymate-qfml.onrender.com

## 🐳 Docker Image
docker build -t studymate-app .
docker run -p 5050:3000 studymate-app

## ⚙️ CI/CD Pipeline
GitHub Actions is used to automatically build the project on every push.