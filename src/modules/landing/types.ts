export interface NavDropdownItem {
  label: string;
  description?: string;
  targetId: string;
  path?: string;
}

export interface NavItem {
  label: string;
  href: string;
  targetId: string;
  children?: NavDropdownItem[];
}

export interface FeatureCardItem {
  id: string;
  icon: "listening" | "reading" | "roadmap" | "ai";
  title: string;
  subtitle: string;
  targetId: string;
}

export interface ListeningPartItem {
  partNumber: number;
  partName: string;
  title: string;
  description: string;
  questionCount: number;
  sampleAudio?: string;
  sampleTranscript?: string;
}

export interface ReadingQuestionOption {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface ReadingPartItem {
  id: string;
  part: string;
  title: string;
  subtitle: string;
  questionLabel: string;
  questionText: string;
  options: ReadingQuestionOption[];
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface RoadmapMilestone {
  weekLabel: string;
  title: string;
  description: string;
  progressPercent: number;
  icon: "target" | "calendar" | "headphones" | "trophy";
}

export interface CourseItem {
  id: string;
  band: string;
  title: string;
  description: string;
  duration: string;
  lessons: number;
  rating: number;
  reviews: number;
  originalPrice: string;
  price: string;
  badge?: string;
  features: string[];
}

export interface VocabularyWord {
  word: string;
  phonetic: string;
  type: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  aiTip: string;
}
