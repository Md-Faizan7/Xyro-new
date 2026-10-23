import React, { useState } from 'react';
import {
  X,
  Search,
  Bookmark,
  Trash2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { SavedSession } from '../types/study';
import { SUBJECTS, PERSONAS } from '../data/constants';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SavedSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAll,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (onlyBookmarked && !s.bookmarked) return false;
    if (selectedSubject !== 'all' && s.subject !== selectedSubject) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchQ = s.question.toLowerCase().includes(q);
      const matchAns = s.response.geminiSolution.directAnswer.toLowerCase().includes(q);
      return matchQ || matchAns;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 shadow-2xl border-l border-slate-800 flex flex-col text-slate-100">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center space-x-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span>Xyro Study History</span>
              </h2>
              <p className="text-xs text-slate-400">
                {sessions.length} questions solved in points
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions or formulas..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setOnlyBookmarked(!onlyBookmarked)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  onlyBookmarked
                    ? 'bg-amber-950 border-amber-800 text-amber-300'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                <span>Saved</span>
              </button>
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No past questions found matching your filter.
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isCurrent = s.id === currentSessionId;
                const persona = PERSONAS[s.persona] || PERSONAS.jarvis;

                return (
                  <div
                    key={s.id}
                    className={`group relative p-3.5 rounded-2xl border transition-all text-left ${
                      isCurrent
                        ? 'border-cyan-500/80 bg-slate-950 shadow-md ring-1 ring-cyan-500/30'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                    }`}
                  >
                    <div
                      onClick={() => {
                        onSelectSession(s.id);
                        onClose();
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-bold text-cyan-400 capitalize">
                          {s.subject}
                        </span>
                        <div className="flex items-center space-x-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(s.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 mb-1">
                        {s.question}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {s.response.geminiSolution.directAnswer}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center space-x-1.5 font-bold text-slate-300">
                          <span
                            className={`w-2 h-2 rounded-full bg-gradient-to-r ${persona.avatarColor}`}
                          />
                          <span>{persona.name}</span>
                        </span>
                        {s.bookmarked && (
                          <span className="text-amber-400 font-bold flex items-center space-x-0.5">
                            <Bookmark className="w-3 h-3 fill-current" />
                            <span>Saved</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(s.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-950 hover:text-rose-400 transition-all text-slate-500 cursor-pointer"
                      title="Delete this session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {sessions.length > 0 && (
            <div className="p-4 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-500">Stored locally</span>
              <button
                onClick={onClearAll}
                className="text-rose-400 hover:underline font-bold cursor-pointer"
              >
                Clear History
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
