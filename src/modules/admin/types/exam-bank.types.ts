export interface PageResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  pageIndex: number;
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  category: string | null;
  year: number | null;
  totalQuestions: number;
  durationMinutes: number;
  totalListeningQuestions: number;
  totalReadingQuestions: number;
  status: string;
}

/** Counts behind the bank overview page: `GET /assessment/api/v1/bank/overview`. */
export interface BankOverview {
  totalQuestions: number;
  listeningQuestions: number;
  readingQuestions: number;
  testQuestions: number;
  bankQuestions: number;
  totalTests: number;
  activeTests: number;
  totalPracticeSets: number;
  totalPassages: number;
  parts: BankPartStats[];
  statuses: { status: string; questions: number }[];
  difficulties: { difficultyLevel: string; questions: number }[];
  practiceSets: { kind: string; sets: number; questions: number }[];
}

export interface BankPartStats {
  part: string;
  section: string;
  questions: number;
  testQuestions: number;
  bankQuestions: number;
  passages: number;
  questionsPerTest: number;
}

export interface Question {
  id: string;
  testId: string | null;
  passageId: string | null;
  questionNumber: number | null;
  questionText: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string | null;
  difficultyLevel: string;
  status: string;
}

/**
 * Text fields may contain simple HTML from the imported sources; render them with RichText.
 * Translations come separately and are only returned to content managers.
 */
export interface QuestionDetail extends Question {
  correctAnswer: string;
  explanation: string | null;
  transcript: string | null;
  transcriptTranslation: string | null;
}

export interface Passage {
  title: string | null;
  content: string | null;
  contentTranslation: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  transcript: string | null;
  questions: Question[];
}
