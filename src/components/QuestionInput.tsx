import React, { useState } from 'react';
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
} from 'lucide-react';
import { PersonaId, SubjectId, AcademicLevel, StudyMode, ThemeId } from '../types/study';
import { PERSONAS, SUBJECTS, ACADEMIC_LEVELS, THEMES } from '../data/constants';

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
  const [subject, setSubject] = useState<SubjectId>('ee');
  const [level, setLevel] = useState<AcademicLevel>('Core Engineering (Sophomore / Junior)');
  const [mode, setMode] = useState<StudyMode>('standard');

  const currentSubjectObj = SUBJECTS.find((s) => s.id === subject) || SUBJECTS[0];
  const activePersonaObj = PERSONAS[selectedPersona] || PERSONAS.jarvis;
  const themeObj = THEMES[currentTheme] || THEMES.cyber;

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
          <div className="flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-300">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                <strong>{attachedNotesCount} note{attachedNotesCount > 1 ? 's' : ''} attached:</strong> {activePersonaObj.name} will reference your lecture slides & handwritten diagrams.
              </span>
            </div>
            {onOpenNotesModal && (
              <button
                type="button"
                onClick={onOpenNotesModal}
                className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer ml-2"
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
            placeholder="Type your question or problem statement here..."
            rows={isCompact ? 2 : 3}
            disabled={isLoading}
            className="w-full px-4 py-3.5 sm:text-base text-sm rounded-2xl bg-slate-950/80 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none shadow-inner"
          />

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-500 flex items-center space-x-1">
              <span>Shortcuts: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">Ctrl+Enter</kbd> to solve</span>
            </span>

            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${themeObj.buttonGradient} disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg transition-all transform active:scale-98 cursor-pointer disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Solving in points...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Breakdown & Solve</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Configurations Bar: Subject, Level, Chatbot Persona, Mode */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Engineering Subject Dropdown with optgroups */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Engineering / Tech Branch
            </label>
            <div className="relative">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as SubjectId)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none appearance-none pr-8 cursor-pointer text-xs"
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
              <div className="absolute right-3 top-2.5 pointer-events-none text-cyan-400">
                {getSubjectIcon(subject)}
              </div>
            </div>
          </div>

          {/* Academic Depth */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Curriculum Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as AcademicLevel)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none appearance-none cursor-pointer text-xs"
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
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Chatbot Persona
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(PERSONAS) as PersonaId[]).map((pId) => {
                const p = PERSONAS[pId];
                const isActive = pId === selectedPersona || (pId === 'xyro' && selectedPersona === 'zyro');
                return (
                  <button
                    key={pId}
                    type="button"
                    onClick={() => onSelectPersona(pId)}
                    title={`${p.name} - ${p.tagline}`}
                    className={`py-1.5 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isActive
                        ? 'border-cyan-500 bg-cyan-950/70 text-cyan-300 font-bold shadow-xs ring-1 ring-cyan-500/40'
                        : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
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
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Explanation Mode
            </label>
            <div className="flex rounded-xl bg-slate-950 p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('standard')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  mode === 'standard'
                    ? 'bg-slate-800 text-cyan-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setMode('socratic')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  mode === 'socratic'
                    ? 'bg-slate-800 text-amber-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Gives point-form hints first before revealing the solution"
              >
                Socratic
              </button>
              <button
                type="button"
                onClick={() => setMode('deep_dive')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  mode === 'deep_dive'
                    ? 'bg-slate-800 text-purple-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Deep-dive proofs and technical derivations"
              >
                Deep-Dive
              </button>
            </div>
          </div>
        </div>

        {/* Persona Tagline */}
        <div className="flex items-center space-x-2 text-[11px] px-3.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400">
          <span className="font-bold text-cyan-400">
            {activePersonaObj.name} ({activePersonaObj.role}):
          </span>
          <span>{activePersonaObj.tagline}</span>
        </div>

        {/* Dynamic Suggestions from notes or previous session ONLY (Blank by default!) */}
        {dynamicSuggestions && dynamicSuggestions.length > 0 && (
          <div className="pt-2 animate-in fade-in duration-200">
            <div className="flex items-center space-x-1.5 mb-2 text-xs font-bold text-cyan-400">
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Suggested topics from your notes & inquiry:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dynamicSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 rounded-xl text-xs bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 hover:text-white border border-cyan-800/60 hover:border-cyan-500/60 transition-all text-left truncate max-w-md cursor-pointer"
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
