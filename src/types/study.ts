export type PersonaId = 'jarvis' | 'vision' | 'xyro' | 'thala' | 'zyro' | 'Meow';

export type ThemeId = 'cyber' | 'midnight' | 'slate' | 'emerald' | 'sunset';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  dotColor: string;
  bgGradient: string;
  cardBg: string;
  borderColor: string;
  accentText: string;
  accentBg: string;
  buttonGradient: string;
}

export interface PersonaInfo {
  id: PersonaId;
  name: string;
  role: string;
  avatarColor: string;
  tagline: string;
  description: string;
  accentClass: string;
  bgLightClass: string;
  borderClass: string;
  badgeClass: string;
  iconName: string;
}

export type SubjectId =
  | 'ee'
  | 'mech'
  | 'cs'
  | 'ai_data'
  | 'robotics'
  | 'civil'
  | 'cheme'
  | 'physics'
  | 'math'
  | 'chemistry'
  | 'biology'
  | 'humanities'
  | 'general';

export interface SubjectInfo {
  id: SubjectId;
  label: string;
  category: 'Engineering & Tech' | 'Sciences & Core';
  icon: string;
  color: string;
  samples: string[];
}

export type AcademicLevel =
  | 'Foundations (Freshman / Prep)'
  | 'Core Engineering (Sophomore / Junior)'
  | 'Advanced / Senior Capstone'
  | 'Graduate & Industry R&D';

export type StudyMode = 'standard' | 'socratic' | 'deep_dive';

export interface StepItem {
  stepNumber: number;
  title: string;
  explanation: string;
  formulaOrCode?: string;
  tip?: string;
}

export interface PracticeQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string;
  mastered?: boolean;
  topic?: string;
  createdAt?: number;
}

export interface StudyBuddyExplanation {
  buddyGreeting: string;
  coreIntent: string;
  prerequisites: string[];
  intuitiveAnalogy: string;
  thinkingRoadmap: string[];
}

export interface GeminiSolution {
  directAnswer: string;
  stepByStep: StepItem[];
  keyTakeaway: string;
  commonPitfalls: string[];
  memoryTrick: string;
}

export interface StudyResponse {
  questionSummary: string;
  studyBuddyExplanation: StudyBuddyExplanation;
  geminiSolution: GeminiSolution;
  interactiveElements: {
    practiceQuiz: PracticeQuiz;
    flashcards: Array<{ front: string; back: string; hint: string }>;
    suggestedFollowUps: string[];
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface SavedSession {
  id: string;
  timestamp: number;
  question: string;
  subject: SubjectId;
  level: AcademicLevel;
  persona: PersonaId;
  mode: StudyMode;
  response: StudyResponse;
  userNotes?: string;
  bookmarked?: boolean;
  quizResult?: { selectedIndex: number; isCorrect: boolean };
  chatMessages?: ChatMessage[];
  attachedNotesCount?: number;
}

export interface UserStats {
  questionsAsked: number;
  quizzesTaken: number;
  quizzesCorrect: number;
  flashcardsMastered: number;
  streakDays: number;
}

export interface ImportedNote {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'text';
  mimeType: string;
  dataBase64?: string; // base64 string without data:mime;base64, prefix for Gemini inlineData
  previewUrl?: string; // for thumbnail rendering in browser
  textContent?: string;
  sizeFormatted: string;
  timestamp: number;
  summary?: string;
}

export interface PomodoroState {
  mode: 'focus' | 'short_break' | 'long_break';
  durationMinutes: number;
  secondsRemaining: number;
  isRunning: boolean;
  totalFocusMinutes: number;
  completedSessions: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}
