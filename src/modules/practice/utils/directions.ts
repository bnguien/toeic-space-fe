/**
 * Exam directions (port of StudyChill `directionsText.js`). The intro and Parts 1–4 match the
 * recordings in `/assets/exam/directions/{intro,part1..part4}.mp3` word for word; Parts 5–7 have
 * no audio.
 */
import type { DirectionsKey } from "./examSteps.ts";

export interface Directions {
  title: string;
  text: string;
}

export const DIRECTIONS: Record<DirectionsKey, Directions> = {
  intro: {
    title: "Listening Test",
    text: "In this section, you will listen to a range of spoken English, including short statements, questions, conversations, and talks. The section lasts about forty-five minutes and is divided into four parts. Instructions are given before each part. Choose the best answer to each question and mark it on your answer sheet.",
  },
  1: {
    title: "Part 1: Photographs",
    text: "For each question in this part, you will see a photograph and hear four short statements about it. The statements are spoken only once, and they are not printed. Choose the statement that best describes what you see in the photograph, and mark your answer.",
  },
  2: {
    title: "Part 2: Question-Response",
    text: "You will hear a question or a statement, followed by three possible responses. They are spoken only once, and they are not printed. Choose the response that best answers the question or statement, and mark your answer.",
  },
  3: {
    title: "Part 3: Conversations",
    text: "You will hear short conversations between two or more people. After each conversation, you will answer three questions about what the speakers said. Some questions may refer to a graphic shown on the screen. The conversations are spoken only once. Choose the best answer to each question, and mark your answer.",
  },
  4: {
    title: "Part 4: Talks",
    text: "You will hear short talks given by a single speaker. After each talk, you will answer three questions about what the speaker said. Some questions may refer to a graphic shown on the screen. The talks are spoken only once. Choose the best answer to each question, and mark your answer.",
  },
  5: {
    title: "Part 5: Incomplete Sentences",
    text: "In the Reading test, you will read a variety of texts and answer several types of reading comprehension questions. In this part, a word or phrase is missing in each of the sentences. Four answer choices are given below each sentence. Choose the best answer to complete the sentence, and mark your answer.",
  },
  6: {
    title: "Part 6: Text Completion",
    text: "Read the texts that follow. A word, a phrase, or a sentence is missing in parts of each text. Four answer choices for each question are given below the text. Choose the best answer to complete the text, and mark your answer.",
  },
  7: {
    title: "Part 7: Reading Comprehension",
    text: "In this part, you will read a selection of texts, such as magazine and newspaper articles, e-mails, and instant messages. Each text or set of texts is followed by several questions. Choose the best answer to each question, and mark your answer.",
  },
};

/** Part 1 sample shown under its directions (English + Vietnamese note). */
export const PART1_SAMPLE = {
  text: "Statement (B), “The people are seated around a table,” best describes the photograph, so you would select answer (B).",
  note: "Ví dụ: câu (B) mô tả đúng bức tranh nhất nên bạn chọn (B). Câu mô tả không in trên màn hình.",
};

/** Directions audio URL (intro + Parts 1–4), or null. */
export function directionsAudio(key: DirectionsKey): string | null {
  if (key === "intro") return "/assets/exam/directions/intro.mp3";
  return key >= 1 && key <= 4 ? `/assets/exam/directions/part${key}.mp3` : null;
}

/** Seconds before moving on when a directions recording fails to play. */
export const DIRECTIONS_FALLBACK_SECONDS = 10;
