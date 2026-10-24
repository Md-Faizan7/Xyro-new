import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertCircle,
  BrainCircuit,
  Zap,
  Upload,
  BookOpen,
  ArrowDown,
} from 'lucide-react';
import { Header } from './components/Header';
import { QuestionInput } from './components/QuestionInput';
import { StudySessionView } from './components/StudySessionView';
import { HistoryDrawer } from './components/HistoryDrawer';
import { FlashcardsDeckModal } from './components/FlashcardsDeckModal';
import { NotesImportModal } from './components/NotesImportModal';
import { ExportModal } from './components/ExportModal';
import {
  PersonaId,
  SubjectId,
  AcademicLevel,
  StudyMode,
  SavedSession,
  Flashcard,
  UserStats,
  ThemeId,
  PomodoroState,
  ImportedNote,
} from './types/study';
import { PERSONAS, THEMES } from './data/constants';

const SESSIONS_STORAGE_KEY = 'xyro_study_sessions_v3';
const DECK_STORAGE_KEY = 'xyro_global_deck_v3';
const THEME_STORAGE_KEY = 'xyro_app_theme_v3';
const POMODORO_STORAGE_KEY = 'xyro_pomodoro_v3';
const NOTES_STORAGE_KEY = 'xyro_imported_notes_v3';
const TOPICS_STORAGE_KEY = 'xyro_dynamic_topics_v3';

export default function App() {
  // Theme state
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
      if (storedTheme && THEMES[storedTheme]) return storedTheme;
    } catch (e) {}
    return 'slate';
  });

  // Pomodoro timer state
  const [pomodoro, setPomodoro] = useState<PomodoroState>(() => {
    try {
      const stored = localStorage.getItem(POMODORO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          isRunning: false,
        };
      }
    } catch (e) {}
    return {
      mode: 'focus',
      durationMinutes: 25,
      secondsRemaining: 25 * 60,
      isRunning: false,
      totalFocusMinutes: 0,
      completedSessions: 0,
      soundEnabled: true,
      notificationsEnabled: false,
    };
  });

  // Imported notes state (starts blank until user uploads)
  const [importedNotes, setImportedNotes] = useState<ImportedNote[]>(() => {
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  // Sessions state: Starts completely blank! Only populates when student asks questions or uploads notes
  const [sessions, setSessions] = useState<SavedSession[]>(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  // Dynamic suggested topics: starts blank until user uploads notes or asks a question
  const [discoveredTopics, setDiscoveredTopics] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(TOPICS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  const [currentPersona, setCurrentPersona] = useState<PersonaId>('jarvis');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals / Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeckOpen, setIsDeckOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Global deck of flashcards: starts blank until generated from questions/notes
  const [globalDeck, setGlobalDeck] = useState<Flashcard[]>(() => {
    try {
      const stored = localStorage.getItem(DECK_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  });

  // Sync theme
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch (e) {}
  }, [currentTheme]);

  // Sync pomodoro
  useEffect(() => {
    try {
      localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(pomodoro));
    } catch (e) {}
  }, [pomodoro]);

  // Sync imported notes
  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(importedNotes));
    } catch (e) {}
  }, [importedNotes]);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {}
  }, [sessions]);

  // Sync discovered topics
  useEffect(() => {
    try {
      localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(discoveredTopics));
    } catch (e) {}
  }, [discoveredTopics]);

  // Sync deck to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(globalDeck));
    } catch (e) {}
  }, [globalDeck]);

  const currentSession = sessions.find((s) => s.id === currentSessionId) || sessions[0] || null;
  const themeObj = THEMES[currentTheme] || THEMES.cyber;

  // Compute live user stats
  const stats: UserStats = {
    questionsAsked: sessions.length,
    quizzesTaken: sessions.filter((s) => s.quizResult).length,
    quizzesCorrect: sessions.filter((s) => s.quizResult?.isCorrect).length,
    flashcardsMastered: globalDeck.filter((c) => c.mastered).length,
    streakDays: 1,
  };

  // Handle asking a new question with attached notes
  const handleSolveQuestion = async (params: {
    question: string;
    subject: SubjectId;
    level: AcademicLevel;
    persona: PersonaId;
    mode: StudyMode;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep(1);

    const timer1 = setTimeout(() => setLoadingStep(2), 1400);
    const timer2 = setTimeout(() => setLoadingStep(3), 2800);

    try {
      const response = await fetch('/api/study/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          attachedNotes: importedNotes,
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let errorMsg = `Server responded with ${response.status}`;
        if (contentType.includes('application/json')) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error) errorMsg = errorData.error;
        } else {
          const text = await response.text().catch(() => '');
          if (text && !text.includes('<!doctype')) {
            errorMsg = text.slice(0, 120);
          }
        }
        throw new Error(errorMsg);
      }

      if (!contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please try again.');
      }

      const data = await response.json();

      const newSession: SavedSession = {
        id: `study-${Date.now()}`,
        timestamp: Date.now(),
        question: params.question,
        subject: params.subject,
        level: params.level,
        persona: params.persona,
        mode: params.mode,
        response: data,
        bookmarked: false,
        attachedNotesCount: importedNotes.length,
      };

      // Add generated flashcards to global deck
      if (data.interactiveElements?.flashcards) {
        const newCards: Flashcard[] = data.interactiveElements.flashcards.map(
          (fc: any, idx: number) => ({
            id: `card-${Date.now()}-${idx}`,
            front: fc.front,
            back: fc.back,
            hint: fc.hint,
            topic: params.subject,
            mastered: false,
          })
        );
        setGlobalDeck((prev) => [...newCards, ...prev]);
      }

      // Add suggested follow-up questions to dynamic suggestions
      if (data.interactiveElements?.suggestedFollowUps) {
        setDiscoveredTopics((prev) =>
          Array.from(new Set([...data.interactiveElements.suggestedFollowUps, ...prev])).slice(0, 8)
        );
      }

      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      setCurrentPersona(params.persona);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to solve question:', err);
      setErrorMessage(
        err.message || 'Something went wrong while communicating with Xyro and Gemini. Please try again.'
      );
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleUpdateSession = (updated: SavedSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSession = (id: string) => {
    const nextSessions = sessions.filter((s) => s.id !== id);
    setSessions(nextSessions);
    if (currentSessionId === id) {
      setCurrentSessionId(nextSessions[0]?.id || '');
    }
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear your study history?')) {
      setSessions([]);
      setCurrentSessionId('');
      setDiscoveredTopics([]);
    }
  };

  const handleToggleDeckCardMastered = (cardId: string) => {
    setGlobalDeck((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, mastered: !c.mastered } : c))
    );
  };

  // Notes management & dynamic topic discovery
  const handleAddNote = (newNote: ImportedNote) => {
    setImportedNotes((prev) => [newNote, ...prev]);
  };

  const handleRemoveNote = (id: string) => {
    setImportedNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAllNotes = () => {
    if (window.confirm('Remove all attached context notes?')) {
      setImportedNotes([]);
    }
  };

  const handleDiscoveredTopics = (newTopics: string[]) => {
    setDiscoveredTopics((prev) =>
      Array.from(new Set([...newTopics, ...prev])).slice(0, 8)
    );
  };

  // Helper background styling based on theme
  const getThemeBackground = () => {
    switch (currentTheme) {
      case 'midnight':
        return 'bg-zinc-950 text-zinc-100';
      case 'emerald':
        return 'bg-stone-950 text-stone-100';
      case 'sunset':
        return 'bg-neutral-950 text-neutral-100';
      case 'slate':
        return 'bg-slate-900 text-slate-100';
      case 'cyber':
      default:
        return 'bg-slate-950 text-slate-100';
    }
  };

  return (
    <div
      className={`min-h-screen ${getThemeBackground()} flex flex-col font-sans transition-colors selection:bg-cyan-500 selection:text-black`}
    >
      {/* Top Navbar with Pomodoro, Import Notes, Export, Theme, Persona, Deck, History */}
      <Header
        currentPersona={currentPersona}
        onSelectPersona={setCurrentPersona}
        currentTheme={currentTheme}
        onSelectTheme={setCurrentTheme}
        stats={stats}
        onOpenDeck={() => setIsDeckOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onNewQuestion={() => {
          const el = document.getElementById('question-input-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        totalFlashcards={globalDeck.length}
        pomodoro={pomodoro}
        onUpdatePomodoro={setPomodoro}
        onOpenNotesModal={() => setIsNotesModalOpen(true)}
        attachedNotesCount={importedNotes.length}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs sm:text-sm flex items-start space-x-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Could not complete breakdown:</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* LOADING STATE ANIMATION: 2-Stage Point Engine Visualizer */}
        {isLoading && (
          <div className="p-8 sm:p-10 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl max-w-xl mx-auto text-center space-y-5 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 mx-auto flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 text-zinc-200" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-100">
                Generating Breakdown
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {importedNotes.length > 0
                  ? `Incorporating ${importedNotes.length} attached note${importedNotes.length > 1 ? 's' : ''}...`
                  : 'Synthesizing concise, high-yield bullet points'}
              </p>
            </div>

            {/* Stepper */}
            <div className="space-y-2 max-w-sm mx-auto text-left text-xs">
              <div
                className={`p-2.5 rounded-lg border flex items-center space-x-2.5 transition-all ${
                  loadingStep >= 1
                    ? 'border-zinc-700 bg-zinc-800/80 text-zinc-200 font-semibold'
                    : 'border-zinc-800/60 opacity-40 text-zinc-500'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-zinc-700 text-zinc-200 font-bold text-[10px] flex items-center justify-center">
                  1
                </div>
                <span>
                  {PERSONAS[currentPersona]?.name || 'Xyro'} extracting problem intent & concepts...
                </span>
              </div>

              <div
                className={`p-2.5 rounded-lg border flex items-center space-x-2.5 transition-all ${
                  loadingStep >= 2
                    ? 'border-zinc-700 bg-zinc-800/80 text-zinc-200 font-semibold'
                    : 'border-zinc-800/60 opacity-40 text-zinc-500'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-zinc-700 text-zinc-200 font-bold text-[10px] flex items-center justify-center">
                  2
                </div>
                <span>Formulating step-by-step master solution...</span>
              </div>

              <div
                className={`p-2.5 rounded-lg border flex items-center space-x-2.5 transition-all ${
                  loadingStep >= 3
                    ? 'border-zinc-700 bg-zinc-800/80 text-zinc-200 font-semibold'
                    : 'border-zinc-800/60 opacity-40 text-zinc-500'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-zinc-700 text-zinc-200 font-bold text-[10px] flex items-center justify-center">
                  3
                </div>
                <span>Generating quick practice quiz & review cards...</span>
              </div>
            </div>
          </div>
        )}

        {/* Current Active Study Session (Only shown when user has asked a question!) */}
        {!isLoading && currentSession && (
          <StudySessionView
            session={currentSession}
            onUpdateSession={handleUpdateSession}
            onSelectPersona={setCurrentPersona}
            currentTheme={currentTheme}
            attachedNotes={importedNotes}
          />
        )}

        {/* CLEAN BLANK STATE (Shown when no questions have been asked yet) */}
        {!isLoading && !currentSession && (
          <div className="p-8 sm:p-10 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 text-center max-w-2xl mx-auto space-y-5">
            <div className="w-11 h-11 rounded-xl bg-zinc-800 text-zinc-200 mx-auto flex items-center justify-center border border-zinc-700">
              <Zap className="w-5 h-5 text-zinc-300" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-zinc-100">
                Start Studying
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                Type or dictate your question below. You can also import lecture slides, diagrams, or handwritten notes to personalize explanations.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                onClick={() => setIsNotesModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-400" />
                <span>Import Notes</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('question-input-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Ask Question Below</span>
              </button>
            </div>
          </div>
        )}

        {/* Question Input Section */}
        <section id="question-input-section" className="pt-2 max-w-5xl mx-auto">
          <QuestionInput
            onSubmit={handleSolveQuestion}
            isLoading={isLoading}
            selectedPersona={currentPersona}
            onSelectPersona={setCurrentPersona}
            currentTheme={currentTheme}
            isCompact={!!currentSession && !isLoading}
            attachedNotesCount={importedNotes.length}
            onOpenNotesModal={() => setIsNotesModalOpen(true)}
            dynamicSuggestions={discoveredTopics}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-bold text-slate-400">
            Xyro.ai &bull; Brief & Informative Point Learning &bull; {pomodoro.totalFocusMinutes} min Active Focus Logged
          </span>
          <span className="text-[11px] text-slate-500">
            Powered by Google Gemini 3.8 Flash &bull; Theme: {themeObj.name}
          </span>
        </div>
      </footer>

      {/* Slide-over History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => setCurrentSessionId(id)}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAllHistory}
      />

      {/* Global Flashcards Deck Modal */}
      <FlashcardsDeckModal
        isOpen={isDeckOpen}
        onClose={() => setIsDeckOpen(false)}
        cards={globalDeck}
        onToggleMastered={handleToggleDeckCardMastered}
      />

      {/* Notes Import Modal (Handwritten Notes & PDFs) */}
      <NotesImportModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        notes={importedNotes}
        onAddNote={handleAddNote}
        onRemoveNote={handleRemoveNote}
        onClearAllNotes={handleClearAllNotes}
        onDiscoveredTopics={handleDiscoveredTopics}
      />

      {/* Export Modal (All Data, Main Topics & Bullet Points, Time Log) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        sessions={sessions}
        pomodoro={pomodoro}
        notes={importedNotes}
      />
    </div>
  );
}
