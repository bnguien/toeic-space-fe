/** vocab.json of a topic (content/grammar/docs/schemas/vocab.schema.json). */

export type GrammarPos = "n" | "v" | "adj" | "adv" | "prep" | "conj" | "pron" | "det" | "phrase";

export type NounCountability = "countable" | "uncountable" | "both" | "plural-only";

export interface GrammarVocabExample {
  sentence: string;
  translation: string;
}

export interface GrammarWordFamilyMember {
  word: string;
  partOfSpeech: GrammarPos | string;
}

export interface GrammarVocabEntry {
  /** `cd04-v-01` */
  id: string;
  /** Dictionary form, lower case. */
  word: string;
  /** US IPA in /…/. */
  ipa: string;
  partOfSpeech: GrammarPos | string;
  /** Required when partOfSpeech is a noun. */
  countability?: NounCountability | string;
  meaning: string;
  collocations: string[];
  example: GrammarVocabExample;
  wordFamily: GrammarWordFamilyMember[];
  trapNote?: string;
  level: string;
  theme: string;
  /** Review word taught first in `cdGoc`. */
  isReview: boolean;
  sourceTopic?: number;
  usedInGrammar: boolean;
}

export interface GrammarVocab {
  version?: string;
  topic?: number | string;
  stage?: string;
  newWordCount?: number;
  entries: GrammarVocabEntry[];
}
