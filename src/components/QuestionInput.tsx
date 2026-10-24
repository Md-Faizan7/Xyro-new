import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  Compass,
  Atom,
  Variable,
  Cpu,
  Dna,
  FlaskConical,
  Landmark,
  Zap,
  Cog,
  Bot,
  Building2,
  Binary,
  Wand2,
  Mic,
  MicOff,
} from 'lucide-react';
import { PersonaId, SubjectId, AcademicLevel, StudyMode, ThemeId } from '../types/study';
import { PERSONAS, AVAILABLE_PERSONA_IDS, SUBJECTS, ACADEMIC_LEVELS, THEMES } from '../data/constants';
import { voiceRecognition } from '../utils/voiceRecognition';

interface QuestionInputProps {
  onSubmit: (params: {
    question: string;
    subject: SubjectId;
    level: AcademicLevel;
    persona: PersonaId;
    mode: StudyMode;
  }) => void;
  isLoading: boolean;
  selectedPersona: PersonaId;
  onSelectPersona: (persona: PersonaId) => void;
  currentTheme: ThemeId;
  initialQuestion?: string;
  isCompact?: boolean;
  attachedNotesCount?: number;
  onOpenNotesModal?: () => void;
  dynamicSuggestions?: string[];
}

export const QuestionInput: React.FC<QuestionInputProps> = ({
  onSubmit,
  isLoading,
  selectedPersona,
  onSelectPersona,
  currentTheme,
  initialQuestion = '',
  isCompact = false,
  attachedNotesCount = 0,
  onOpenNotesModal,
  dynamicSuggestions = [],
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState('');
  const [subject, setSubject] = useState<SubjectId>('ee');
  const [level, setLevel] = useState<AcademicLevel>('Core Engineering (Sophomore / Junior)');
  const [mode, setMode] = useState<StudyMode>('standard');

  const [voiceError, setVoiceError] = useState<string | null>(null);

  const currentSubjectObj = SUBJECTS.find((s) => s.id === subject) || SUBJECTS[0];
  const activePersonaObj = PERSONAS[selectedPersona] || PERSONAS.jarvis;
  const themeObj = THEMES[currentTheme] || THEMES.slate;

  useEffect(() => {
    return () => {
      voiceRecognition.stop();
    };
  }, []);

  const handleToggleVoiceDictation = async () => {
    if (isVoiceListening || isVoiceProcessing) {
      voiceRecognition.stop();
      setIsVoiceListening(false);
      setVoiceInterim('');
    } else {
      setVoiceInterim('');
      setVoiceError(null);
      setIsVoiceProcessing(false);

      const started = await voiceRecognition.start({
        onStart: () => {
          setIsVoiceListening(true);
          setVoiceError(null);
        },
        onInterim: (interim) => {
          setVoiceInterim(interim);
        },
        onFinal: (finalText) => {
          setQuestion((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalText}` : finalText;
          });
          setVoiceInterim('');
        },
        onProcessing: (proc) => {
          setIsVoiceProcessing(proc);
        },
        onError: (err) => {
          setIsVoiceListening(false);
          setIsVoiceProcessing(false);
          setVoiceInterim('');
          setVoiceError(err);
        },
        onEnd: () => {
          setIsVoiceListening(false);
          setIsVoiceProcessing(false);
          setVoiceInterim('');
        },
      });

      if (!started && !voiceRecognition.isSupported()) {
        setVoiceError('Microphone access is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || isLoading) return;
    onSubmit({
      question: question.trim(),
      subject,
      level,
      persona: selectedPersona,
      mode,
    });
  };

  const handleSuggestionClick = (text: string) => {
    setQuestion(text);
  };

  const getSubjectIcon = (id: SubjectId) => {
    switch (id) {
      case 'ee':
        return <Zap className="w-3.5 h-3.5" />;
      case 'mech':
        return <Cog className="w-3.5 h-3.5" />;
      case 'cs':
        return <Cpu className="w-3.5 h-3.5" />;
      case 'ai_data':
        return <Binary className="w-3.5 h-3.5" />;
      case 'robotics':
        return <Bot className="w-3.5 h-3.5" />;
      case 'civil':
        return <Building2 className="w-3.5 h-3.5" />;
      case 'cheme':
      case 'chemistry':
        return <FlaskConical className="w-3.5 h-3.5" />;
      case 'physics':
        return <Atom className="w-3.5 h-3.5" />;
      case 'math':
        return <Variable className="w-3.5 h-3.5" />;
      case 'biology':
        return <Dna className="w-3.5 h-3.5" />;
      case 'humanities':
        return <Landmark className="w-3.5 h-3.5" />;
      case 'general':
      default:
        return <Compass className="w-3.5 h-3.5" />;
    }
  };

  const engineeringSubjects = SUBJECTS.filter((s) => s.category === 'Engineering & Tech');
  const scienceSubjects = SUBJECTS.filter((s) => s.category === 'Sciences & Core');

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isCompact
          ? 'bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl'
          : 'bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl'
      }`}
    >
      {/* Top Banner when not compact */}
      {!isCompact && (
        <div className="mb-6 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-bold mb-3 shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Xyro.ai Point Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ask any engineering question.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">
              Get brief, high-yield points
            </span>
            .
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400">
            Ask a question or import your lecture notes/PDFs to generate contextual breakdowns and suggestions.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Attached Notes Context Pill */}
        {attachedNotesCount > 0 && (
          <div className="flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span>
                <strong>{attachedNotesCount} note{attachedNotesCount > 1 ? 's' : ''} attached:</strong> {activePersonaObj.name} will reference your lecture slides & handwritten diagrams.
              </span>
            </div>
            {onOpenNotesModal && (
              <button
                type="button"
                onClick={onOpenNotesModal}
                className="text-[11px] font-semibold text-zinc-300 hover:text-white underline cursor-pointer ml-2"
              >
                Manage
              </button>
            )}
          </div>
        )}

        {/* Input box */}
        <div className="relative">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
            placeholder={
              isVoiceProcessing
                ? 'Transcribing your voice with Gemini...'
                : isVoiceListening
                ? (voiceInterim ? `Listening: "${voiceInterim}"` : 'Listening to your voice... Speak your question now (click Stop Mic when done)')
                : 'Type or speak your question / problem statement here...'
            }
            rows={isCompact ? 2 : 3}
            disabled={isLoading || isVoiceProcessing}
            className={`w-full px-4 py-3.5 sm:text-base text-sm rounded-xl bg-zinc-950/90 border text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all resize-none shadow-sm ${
              isVoiceListening
                ? 'border-rose-500 ring-1 ring-rose-500/50'
                : 'border-zinc-800 focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600'
            }`}
          />

          {voiceError && (
            <div className="mt-2 text-xs text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-1.5 flex items-center justify-between">
              <span>{voiceError}</span>
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="text-zinc-400 hover:text-white text-xs ml-2 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/80">
            <span className="text-[11px] text-zinc-500 flex items-center space-x-1">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-300 text-[10px] border border-zinc-700">Ctrl+Enter</kbd> to solve</span>
            </span>

            <div className="flex items-center space-x-2">
              {/* Voice Dictation Button */}
              <button
                type="button"
                onClick={handleToggleVoiceDictation}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                  isVoiceProcessing
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                    : isVoiceListening
                    ? 'bg-rose-900/80 text-rose-100 border-rose-700 animate-pulse'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
                title={isVoiceListening ? 'Stop listening' : 'Dictate question with microphone'}
              >
                {isVoiceProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                    <span>Transcribing...</span>
                  </>
                ) : isVoiceListening ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-rose-300" />
                    <span>Stop Mic</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Voice Input</span>
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg ${themeObj.buttonGradient} disabled:opacity-50 text-xs sm:text-sm font-semibold transition-all active:scale-98 cursor-pointer disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    <span>Solving quickly...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Solve in Points</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Configurations Bar: Subject, Level, Chatbot Persona, Mode */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Engineering Subject Dropdown with optgroups */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Branch / Subject
            </label>
            <div className="relative">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectId)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-medium focus:ring-1 focus:ring-zinc-600 focus:outline-none appearance-none pr-8 cursor-pointer text-xs"
              >
                <optgroup label="Engineering & Technical">
                  {engineeringSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Foundational Sciences & Math">
                  {scienceSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="absolute right-3 top-2.5 pointer-events-none text-zinc-400">
                {getSubjectIcon(subject)}
              </div>
            </div>
          </div>

          {/* Academic Depth */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Curriculum Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as AcademicLevel)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-medium focus:ring-1 focus:ring-zinc-600 focus:outline-none appearance-none cursor-pointer text-xs"
            >
              {ACADEMIC_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Chatbot Persona Switcher */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Chatbot Persona
            </label>
            <div className="grid grid-cols-4 gap-1">
              {AVAILABLE_PERSONA_IDS.map((pId) => {
                const p = PERSONAS[pId] || PERSONAS.jarvis;
                const isActive =
                  pId === selectedPersona ||
                  (pId === 'Meow' && (selectedPersona === 'xyro' || selectedPersona === 'zyro')) ||
                  (pId === 'xyro' && selectedPersona === 'Meow');
                return (
                  <button
                    key={pId}
                    type="button"
                    onClick={() => onSelectPersona(pId)}
                    title={`${p.name} - ${p.tagline}`}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isActive
                        ? 'border-zinc-500 bg-zinc-800 text-zinc-100 font-semibold shadow-xs ring-1 ring-zinc-500/40'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className="text-[11px] truncate w-full">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Study Mode */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Explanation Mode
            </label>
            <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
              <button
                type="button"
                onClick={() => setMode('standard')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  mode === 'standard'
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setMode('socratic')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  mode === 'socratic'
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Gives point-form hints first before revealing the solution"
              >
                Socratic
              </button>
              <button
                type="button"
                onClick={() => setMode('deep_dive')}
                className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  mode === 'deep_dive'
                    ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Deep-dive proofs and technical derivations"
              >
                Deep-Dive
              </button>
            </div>
          </div>
        </div>

        {/* Persona Tagline */}
        <div className="flex items-center space-x-2 text-[11px] px-3 py-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-400">
          <span className="font-semibold text-zinc-200">
            {activePersonaObj.name} ({activePersonaObj.role}):
          </span>
          <span>{activePersonaObj.tagline}</span>
        </div>

        {/* Dynamic Suggestions from notes or previous session ONLY (Blank by default!) */}
        {dynamicSuggestions && dynamicSuggestions.length > 0 && (
          <div className="pt-2 animate-in fade-in duration-150">
            <div className="flex items-center space-x-1.5 mb-1.5 text-xs font-medium text-zinc-400">
              <Wand2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Suggested topics from your notes & inquiry:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dynamicSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 transition-all text-left truncate max-w-md cursor-pointer"
                >
                  &ldquo;{suggestion}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
