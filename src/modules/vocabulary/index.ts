import { vocabularyApi } from "./api/vocabulary.api";

export { vocabularyRoutes } from "./routes";

/* Public API reused by the PBL-107 games: news/video word lookup and save, the video word card and lesson
   summary, the grammar Vocabulary tab and the dictation vocab interlude (study cards on local word decks,
   background clips), plus the site-wide "select text to look it up" layer. */
export { vocabularyApi };
export { AudioButton } from "./components/AudioButton";
export { FolderPicker } from "./components/FolderPicker";
export { QuizCard } from "./components/QuizCard";
export { ReelCard } from "./components/ReelCard";
export { StudyBackdrop } from "./components/StudyBackdrop";
export type { AnswerOptions, StudyCardApi } from "./components/StudySession";
export { SelectionLookupProvider } from "./components/SelectionLookupProvider";
export { useCreateCustomWord } from "./hooks/useCreateCustomWord";
export { useInvalidateLibrary } from "./hooks/useInvalidateLibrary";
export { useImportWords, type ImportRunState } from "./hooks/useImportWords";
export { useIsLearner } from "./hooks/useIsLearner";
export { useLearnerSummary } from "./hooks/useLearnerSummary";
export { useLibrary } from "./hooks/useLibrary";
export { useReelBackgrounds } from "./hooks/useReelBackgrounds";
export { useRemoveSavedWord } from "./hooks/useRemoveSavedWord";
export { useSaveWord } from "./hooks/useSaveWord";
export { useSelectionLookup } from "./hooks/useSelectionLookup";
export { useLookupGate } from "./hooks/useLookupGate";
export { useUpdateSavedWord } from "./hooks/useUpdateSavedWord";
export { useVocabularyPreferences } from "./hooks/useVocabularyPreferences";
export { cardThemeOf } from "./utils/card-themes";
export { createLocalStudyCard } from "./utils/local-study-card";
export { speak, stopSpeaking, type SpeechLang } from "./utils/speech";
export { DEFAULT_STUDY_SETTINGS } from "./utils/study-settings";
export { formatPartOfSpeech } from "./utils/vocabulary-format";
export { getVocabularyErrorMessage } from "./utils/vocabulary-errors";
export type {
  FolderDto,
  ImportItem,
  ImportRequest,
  ImportResultDto,
  LibraryDto,
  PartOfSpeech,
  QuizQuestionDto,
  ReelBackgroundDto,
  ReviewGrade,
  SavedWordDto,
  WordDto,
  WordLookupDto,
  WordLookupRequest,
  WordsSessionState,
} from "./types/vocabulary.types";

/** POST lookup — word/phrase enrichment (signed in). */
export const lookupVocabulary = vocabularyApi.lookup;
/** POST me/words/import — saves official matches or creates/fills custom words (1..50 items). */
export const importVocabularyWords = vocabularyApi.importWords;
