import React, { useState } from 'react';
import {
  Sparkles,
  GraduationCap,
  Lightbulb,
  Target,
  History,
  ChevronDown,
  Layers,
  Palette,
  Check,
  Zap,
  Upload,
  Download,
  FileText,
} from 'lucide-react';
import { PersonaId, UserStats, ThemeId, PomodoroState } from '../types/study';
import { PERSONAS, THEMES } from '../data/constants';
import { PomodoroTimer } from './PomodoroTimer';

interface HeaderProps {
  currentPersona: PersonaId;
  onSelectPersona: (persona: PersonaId) => void;
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  stats: UserStats;
  onOpenDeck: () => void;
  onOpenHistory: () => void;
  onNewQuestion: () => void;
  totalFlashcards: number;
  pomodoro: PomodoroState;
  onUpdatePomodoro: (p: PomodoroState) => void;
  onOpenNotesModal: () => void;
  attachedNotesCount: number;
  onOpenExportModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPersona,
  onSelectPersona,
  currentTheme,
  onSelectTheme,
  stats,
  onOpenDeck,
  onOpenHistory,
  onNewQuestion,
  totalFlashcards,
  pomodoro,
  onUpdatePomodoro,
  onOpenNotesModal,
  attachedNotesCount,
  onOpenExportModal,
}) => {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const persona = PERSONAS[currentPersona] || PERSONAS.jarvis;
  const activeTheme = THEMES[currentTheme] || THEMES.cyber;

  const getPersonaIcon = (id: PersonaId) => {
    switch (id) {
      case 'vision':
        return <GraduationCap className="w-4 h-4" />;
      case 'xyro':
      case 'zyro':
        return <Lightbulb className="w-4 h-4" />;
      case 'thala':
        return <Target className="w-4 h-4" />;
      case 'jarvis':
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Zyro + Pomodoro Timer */}
        <div className="flex items-center space-x-3 sm:space-x-5">
          <div
            className="flex items-center space-x-2.5 cursor-pointer group"
            onClick={onNewQuestion}
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-500/30 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white flex items-center">
                  Xyro<span className="text-cyan-400">.ai</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.2 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 shadow-2xs">
                  Points
                </span>
              </div>
            </div>
          </div>

          {/* Pomodoro Timer in Top Navigation */}
          <div className="border-l border-slate-800 pl-3 sm:pl-4">
            <PomodoroTimer pomodoro={pomodoro} onUpdatePomodoro={onUpdatePomodoro} />
          </div>
        </div>

        {/* Right Action Toolbar: Import Notes, Export, Deck, History, Theme, Persona */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Import Notes Button */}
          <button
            onClick={onOpenNotesModal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              attachedNotesCount > 0
                ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 ring-1 ring-cyan-500/40'
                : 'border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-slate-300'
            }`}
            title="Import handwritten notes, PDFs, and lecture slides"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Import Notes</span>
            {attachedNotesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-800 text-white text-[10px] font-bold">
                {attachedNotesCount}
              </span>
            )}
          </button>

          {/* Export Data Button */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-300 shadow-sm transition-all cursor-pointer"
            title="Export study data, focus time, and main bullet points"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Theme Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowPersonaMenu(false);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 transition-all text-xs font-medium text-slate-300 shadow-sm cursor-pointer"
              title="Change Theme"
            >
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <div
                className="w-2.5 h-2.5 rounded-full shadow-xs"
                style={{ backgroundColor: activeTheme.dotColor }}
              />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showThemeMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowThemeMenu(false)} />
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900 shadow-2xl border border-slate-800 p-2 z-20 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Theme
                  </div>
                  {(Object.keys(THEMES) as ThemeId[]).map((tId) => {
                    const themeObj = THEMES[tId];
                    const isSelected = tId === currentTheme;
                    return (
                      <button
                        key={tId}
                        onClick={() => {
                          onSelectTheme(tId);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between text-xs mb-1 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 text-white font-semibold ring-1 ring-cyan-500/50'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-3 h-3 rounded-full ring-1 ring-white/30"
                            style={{ backgroundColor: themeObj.dotColor }}
                          />
                          <span>{themeObj.name}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Persona Switcher (Jarvis, Zyro, Thala, Vision) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPersonaMenu(!showPersonaMenu);
                setShowThemeMenu(false);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 transition-all text-xs font-bold text-slate-200 shadow-sm cursor-pointer"
              title="Change Chatbot Persona"
            >
              <div
                className={`w-5 h-5 rounded-full bg-gradient-to-r ${persona.avatarColor} text-white flex items-center justify-center text-[10px] shadow-xs`}
              >
                {getPersonaIcon(currentPersona)}
              </div>
              <span className="text-white hidden sm:inline">{persona.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showPersonaMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPersonaMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 shadow-2xl border border-slate-800 p-2 z-20 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Chatbot
                  </div>
                  {(Object.keys(PERSONAS) as PersonaId[]).map((pId) => {
                    const p = PERSONAS[pId];
                    const isSelected = pId === currentPersona;
                    return (
                      <button
                        key={pId}
                        onClick={() => {
                          onSelectPersona(pId);
                          setShowPersonaMenu(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start space-x-3 mb-1 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border border-slate-700 shadow-xs'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl bg-gradient-to-br ${p.avatarColor} text-white flex items-center justify-center text-xs shadow-md shrink-0 mt-0.5`}
                        >
                          {getPersonaIcon(pId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-cyan-400 font-medium">
                              {p.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {p.tagline}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Flashcard Deck */}
          <button
            onClick={onOpenDeck}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-300 shadow-sm transition-all cursor-pointer"
            title="Review Flashcard Deck"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Deck</span>
            {totalFlashcards > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-400 text-[10px] font-bold border border-amber-800/60">
                {totalFlashcards}
              </span>
            )}
          </button>

          {/* History */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-300 shadow-sm transition-all cursor-pointer"
            title="View Past Sessions"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">History</span>
          </button>
        </div>
      </div>
    </header>
  );
};
