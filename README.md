<h1 align="center">TOEICSpace</h1>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/REACT-20232A?style=for-the-badge&amp;logo=react&amp;logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TYPESCRIPT-007ACC?style=for-the-badge&amp;logo=typescript&amp;logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/VITE-646CFF?style=for-the-badge&amp;logo=vite&amp;logoColor=FFD62E" />
</p>

TOEICSpace is an online TOEIC Listening and Reading learning and test preparation platform combined with a Learning Management System (LMS) for language centers.

The platform is designed to provide learners with structured study paths, personalized practice, and progress tracking while helping language centers manage courses, classes, assignments, and academic operations. This repository contains the TOEICSpace frontend application.

## ✨ Features

- Structured learning through courses, modules, and lessons.
- Vocabulary learning and review with flashcards.
- Practice for TOEIC Parts 1–7, mini tests, mock tests, and placement tests.
- Learning progress, test result, and attempt history tracking.
- Mistake Notebook, Smart Review, and on-demand answer explanations.
- Classroom, assignment, schedule, attendance, and notification management.
- Personalized TOEIC goals and learning roadmaps.
- User, role, permission, course, and class management.
- Tuition payment, invoice, receipt, and refund management.

The current scope focuses on TOEIC Listening and Reading. TOEIC Speaking and Writing, live video classrooms, and advanced CRM features are not currently included.

## 🛠️ Installation

### Prerequisites

- Node.js `>= 22 < 23`
- npm `>= 10 < 11`
- Git

### Local setup

1. Clone the repository:

   ```bash
   git clone git@github.com:bnguien/toeic-space-fe.git
   cd toeic-space-fe
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file:

   ```bash
   cp .env-example .env
   ```

4. Set the backend API URL in `.env`:

   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```

## 🚀 Usage

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Create and preview a production build:

```bash
npm run build
npm run preview
```

Run the application with Docker Compose:

```bash
docker compose up --build
```

Useful quality checks:

```bash
npm run typecheck
npm run lint
npm run format:check
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).
