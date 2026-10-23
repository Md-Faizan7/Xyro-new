import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GraduationCap,
  Lightbulb,
  Target,
  Volume2,
  VolumeX,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Layers,
  FileText,
  RotateCw,
  Copy,
  Check,
  Send,
  Zap,
  CheckCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  SavedSession,
  PersonaId,
  ChatMessage,
  Flashcard,
  ThemeId,
  ImportedNote,
} from '../types/study';
import { PERSONAS, THEMES } from '../data/constants';
import { speechManager } from '../utils/speech';

interface StudySessionViewProps {
  session: SavedSession;
  onUpdateSession: (updated: SavedSession) => void;
  onSelectPersona?: (p: PersonaId) => void;
  onAddFlashcardToDeck?: (card: Flashcard) => void;
  currentTheme?: ThemeId;
  attachedNotes?: ImportedNote[];
}

export const StudySessionView: React.FC<StudySessionViewProps> = ({
  session,
  onUpdateSession,
  currentTheme = 'cyber',
  attachedNotes = [],
}) => {
  const [activeTab, setActiveTab] = useState<'solution' | 'quiz' | 'flashcards' | 'chat' | 'notes'>('solution');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Flashcard local state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [showCardHint, setShowCardHint] = useState(false);
  const [masteredCards, setMasteredCards] = useState<Record<number, boolean>>({});

  // Quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(
    session.quizResult ? session.quizResult.selectedIndex : null
  );
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(!!session.quizResult);

  // Chat follow-up state (persisted across session tabs)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => session.chatMessages || []);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Notes state
  const [notes, setNotes] = useState(session.userNotes || '');

  // Socratic hint state
  const [socraticHints, setSocraticHints] = useState<string[]>([]);
  const [isLoadingHint, setIsLoadingHint] = useState(false);

  const persona = PERSONAS[session.persona] || PERSONAS.jarvis;
  const theme = THEMES[currentTheme] || THEMES.cyber;
  const res = session.response;

  // Sync speech state
  useEffect(() => {
    speechManager.onStateChange((speaking) => {
      setIsSpeaking(speaking);
    });
    return () => {
      speechManager.stop();
    };
  }, []);

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      speechManager.stop();
    } else {
      const textToRead = `${persona.name} says: ${res.studyBuddyExplanation.buddyGreeting}. Direct solution: ${res.geminiSolution.directAnswer}. Key takeaway: ${res.geminiSolution.keyTakeaway}`;
      speechManager.speak(textToRead, session.persona);
    }
  };

  const handleBookmarkToggle = () => {
    onUpdateSession({
      ...session,
      bookmarked: !session.bookmarked,
    });
  };

  const handleCopySummary = () => {
    const text = `# ${session.question}\n\n## Xyro's Solution\n${res.geminiSolution.directAnswer}\n\n### Key Takeaway\n${res.geminiSolution.keyTakeaway}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuizSelect = (index: number) => {
    if (quizSubmitted) return;
    setSelectedQuizOption(index);
    setQuizSubmitted(true);

    const isCorrect = index === res.interactiveElements.practiceQuiz.correctIndex;
    if (isCorrect) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#6366f1', '#10b981', '#f59e0b'],
        });
      } catch (e) {}
    }

    onUpdateSession({
      ...session,
      quizResult: { selectedIndex: index, isCorrect },
    });
  };

  const handleResetQuiz = () => {
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
  };

  const handleToggleCardMastered = (cardIndex: number) => {
    setMasteredCards((prev) => ({
      ...prev,
      [cardIndex]: !prev[cardIndex],
    }));
  };

  const handleSaveNotes = (val: string) => {
    setNotes(val);
    onUpdateSession({
      ...session,
      userNotes: val,
    });
  };

  const handleSendChatMessage = async (msgToSend?: string) => {
    const message = (msgToSend || chatInput).trim();
    if (!message || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    const updatedWithUser = [...chatMessages, userMsg];
    setChatMessages(updatedWithUser);
    onUpdateSession({
      ...session,
      chatMessages: updatedWithUser,
    });
    setChatInput('');
    setIsSendingChat(true);

    try {
      const response = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: session.question,
          originalContext: {
            studyBuddyExplanation: res.studyBuddyExplanation,
            geminiSolution: res.geminiSolution,
          },
          chatHistory: updatedWithUser,
          userMessage: message,
          persona: session.persona,
          attachedNotes,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Server responded with ${response.status}`);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Here is more context on that topic.',
        timestamp: Date.now(),
      };
      const finalChat = [...updatedWithUser, botMsg];
      setChatMessages(finalChat);
      onUpdateSession({
        ...session,
        chatMessages: finalChat,
      });
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Please try again.'}`,
        timestamp: Date.now(),
      };
      const errChat = [...updatedWithUser, errMsg];
      setChatMessages(errChat);
      onUpdateSession({
        ...session,
        chatMessages: errChat,
      });
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleRequestHint = async () => {
    if (isLoadingHint) return;
    setIsLoadingHint(true);
    try {
      const response = await fetch('/api/study/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: session.question,
          subject: session.subject,
          level: session.level,
          hintNumber: socraticHints.length + 1,
        }),
      });
      const data = await response.json();
      if (data.hint) {
        setSocraticHints((prev) => [...prev, data.hint]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHint(false);
    }
  };

  // Helper to render text with bullet points cleanly
  const renderPointFormat = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n').filter((l) => l.trim().length > 0);

    return (
      <div className="space-y-2">
        {lines.map((line, idx) => {
          const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
          return (
            <div key={idx} className="flex items-start space-x-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
              <span className="text-sm leading-relaxed text-slate-200">{cleanLine}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Helper to render chat messages with structured markdown, bolding, formulas, and bullet points
  const renderChatMessageContent = (content: string, isUser: boolean) => {
    if (isUser) {
      return <div className="whitespace-pre-wrap">{content}</div>;
    }

    // Helper to format inline bold (**text**) and code (`text`)
    const formatInline = (text: string) => {
      const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return tokens.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-cyan-300 text-xs"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });
    };

    // Pre-clean raw LaTeX patterns and ASCII box lines if any slipped through
    const sanitized = content
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
      .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
      .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
      .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
      .replace(/^---+$/gm, '');

    const rawLines = sanitized.split('\n');
    const blocks: Array<{ type: 'header' | 'bullet' | 'table' | 'paragraph'; text?: string; rows?: string[][] }> = [];

    let currentTableRows: string[][] = [];

    const flushTable = () => {
      if (currentTableRows.length > 0) {
        blocks.push({ type: 'table', rows: [...currentTableRows] });
        currentTableRows = [];
      }
    };

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Skip ASCII border lines like +----+ or |----|
      if (/^[+\-| \t]{5,}$/.test(line)) {
        continue;
      }

      // Detect table row (e.g. | Feature | Negative | Positive |)
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        // Skip separator rows like |:---:|:---:|
        if (cells.every((c) => /^:?-+:?$/.test(c))) {
          continue;
        }
        currentTableRows.push(cells);
        continue;
      } else {
        flushTable();
      }

      // Detect section header: ### Title or ## Title
      if (/^#{1,4}\s+/.test(line)) {
        blocks.push({
          type: 'header',
          text: line.replace(/^#{1,4}\s+/, ''),
        });
      }
      // Detect bullet points: •, -, *, or 1., 2.
      else if (/^(?:[•\-\*]|\d+[\.)])\s+/.test(line)) {
        blocks.push({
          type: 'bullet',
          text: line.replace(/^(?:[•\-\*]|\d+[\.)])\s+/, ''),
        });
      } else {
        blocks.push({
          type: 'paragraph',
          text: line,
        });
      }
    }
    flushTable();

    return (
      <div className="space-y-2.5">
        {blocks.map((block, i) => {
          if (block.type === 'header' && block.text) {
            return (
              <div key={i} className="pt-2 pb-0.5 border-b border-slate-800/80">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {formatInline(block.text)}
                </span>
              </div>
            );
          }

          if (block.type === 'bullet' && block.text) {
            return (
              <div key={i} className="flex items-start space-x-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-xs shadow-cyan-400/50" />
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed flex-1">
                  {formatInline(block.text)}
                </div>
              </div>
            );
          }

          if (block.type === 'table' && block.rows && block.rows.length > 0) {
            const headerRow = block.rows[0];
            const dataRows = block.rows.slice(1);
            return (
              <div key={i} className="my-2.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-cyan-300 font-bold">
                      {headerRow.map((cell, cIdx) => (
                        <th key={cIdx} className="p-2 font-semibold">
                          {formatInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dataRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-2 text-slate-300">
                            {formatInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          if (block.type === 'paragraph' && block.text) {
            return (
              <p key={i} className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {formatInline(block.text)}
              </p>
            );
          }

          return null;
        })}
      </div>
    );
  };

  const flashcards = res.interactiveElements?.flashcards || [];
  const currentCard = flashcards[currentCardIndex];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. QUESTION HEADER CARD */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 capitalize">
              {session.subject}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
              {session.level}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold border border-slate-700 bg-slate-800/90 flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${persona.avatarColor}`} />
              <span className="text-white">{persona.name}</span>
            </span>
            {session.mode === 'socratic' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                Socratic Mode
              </span>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={handleToggleSpeech}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-950/80 border-rose-800 text-rose-300 animate-pulse'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title={isSpeaking ? 'Stop read aloud' : 'Listen to Xyro explanation'}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Read Points'}</span>
            </button>

            <button
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                session.bookmarked
                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Bookmark session"
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={handleCopySummary}
              className="p-2 rounded-xl border bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 transition-all cursor-pointer"
              title="Copy point summary"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* The Question */}
        <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
          &ldquo;{session.question}&rdquo;
        </h2>

        {/* Short Goal Pill */}
        {res.questionSummary && (
          <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 font-medium">
            <span className="font-bold text-cyan-400">Core Goal:</span>
            <span>{res.questionSummary}</span>
          </div>
        )}
      </div>

      {/* Socratic Hint Box if applicable */}
      {session.mode === 'socratic' && (
        <div className="bg-amber-950/40 border border-amber-800/70 rounded-3xl p-5 sm:p-6 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">
                Socratic Guided Thinking
              </h3>
            </div>
            <button
              onClick={handleRequestHint}
              disabled={isLoadingHint}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoadingHint ? 'Generating hint...' : `Get Hint #${socraticHints.length + 1}`}
            </button>
          </div>

          <p className="text-xs text-slate-300 mb-2">
            Try answering yourself using {persona.name}&apos;s guidance before looking at Xyro&apos;s solution!
          </p>

          {socraticHints.length > 0 && (
            <div className="space-y-2 mt-3">
              {socraticHints.map((hint, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-amber-800/80 text-xs sm:text-sm text-slate-200 flex items-start space-x-2.5"
                >
                  <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-bold shrink-0 mt-0.5 border border-amber-800">
                    Hint {idx + 1}
                  </span>
                  <span>{hint}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NAVIGATION TABS: Point Breakdown, Quiz, Flashcards, Chat, Notes */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-slate-800 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('solution')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'solution'
              ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Point Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Quick Quiz</span>
          {session.quizResult && (
            <span
              className={`w-2 h-2 rounded-full ${
                session.quizResult.isCorrect ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'flashcards'
              ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Cards ({flashcards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <span>Chat with {persona.name}</span>
          {chatMessages.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-bold border border-cyan-800">
              {chatMessages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-400" />
          <span>My Notes {notes.trim() ? '•' : ''}</span>
        </button>
      </div>

      {/* TAB 1: BRIEF POINT FORMAT (XYRO'S SOLUTION) */}
      {activeTab === 'solution' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* ========================================================= */}
          {/* XYRO'S COMPREHENSIVE SOLUTION IN CLEAN POINTS */}
          {/* ========================================================= */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-7 shadow-xl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800">
                      Step-by-Step
                    </span>
                    <h3 className="font-extrabold text-white text-base sm:text-lg">
                      Xyro&apos;s Solution
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Direct answer &bull; Point-by-point derivation &bull; Golden takeaways
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-xl bg-purple-950/70 text-purple-300 border border-purple-800 text-xs font-bold">
                Xyro Master Solution
              </span>
            </div>

            {/* Direct Answer Highlight */}
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-slate-950 border-l-4 border-cyan-500 border-y border-r border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Direct Answer</span>
              </div>
              <p className="text-base font-bold text-white leading-relaxed">
                {res.geminiSolution.directAnswer}
              </p>
            </div>

            {/* Step-by-Step Points */}
            <div className="space-y-3.5 mb-6">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Derivation & Solution Steps
              </h4>

              {res.geminiSolution.stepByStep.map((step) => (
                <div
                  key={step.stepNumber}
                  className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5 shadow-xs"
                >
                  <div className="flex items-center space-x-2.5 mb-2.5">
                    <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {step.stepNumber}
                    </span>
                    <h5 className="font-bold text-white text-sm sm:text-base">
                      {step.title}
                    </h5>
                  </div>

                  {/* Bullet format points for the step */}
                  <div className="pl-8">
                    {renderPointFormat(step.explanation)}

                    {/* Formula or Code Snippet */}
                    {step.formulaOrCode && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-xs sm:text-sm overflow-x-auto shadow-inner">
                        <code>{step.formulaOrCode}</code>
                      </div>
                    )}

                    {/* Tip */}
                    {step.tip && (
                      <div className="mt-2.5 flex items-start space-x-2 text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/60">
                        <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        <span>{step.tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Key Golden Takeaway Banner */}
            <div className="mb-4 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/70">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-[11px] uppercase tracking-wider mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Key Golden Takeaway</span>
              </div>
              <p className="text-sm text-emerald-200 font-bold leading-relaxed">
                • {res.geminiSolution.keyTakeaway}
              </p>
            </div>

            {/* Common Pitfalls in bullet format */}
            {res.geminiSolution.commonPitfalls && res.geminiSolution.commonPitfalls.length > 0 && (
              <div className="mb-4 p-4 rounded-2xl bg-rose-950/30 border border-rose-800/60">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-[11px] uppercase tracking-wider mb-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Traps & Mistakes To Avoid</span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm text-rose-200">
                  {res.geminiSolution.commonPitfalls.map((pitfall, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-rose-400 font-bold mt-0.5">•</span>
                      <span>{pitfall.replace(/^[•\-\*]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Trick */}
            {res.geminiSolution.memoryTrick && (
              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/60 flex items-center space-x-3">
                <Target className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="text-xs sm:text-sm text-purple-200">
                  <span className="font-bold text-purple-300 mr-2">Memory Hook:</span>
                  <span>&ldquo;{res.geminiSolution.memoryTrick}&rdquo;</span>
                </div>
              </div>
            )}
          </section>

          {/* Quick Quiz & Flashcard Navigation bar */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white text-sm">
                Test your knowledge on this problem
              </h4>
              <p className="text-xs text-slate-400">
                Try the 1-question quiz or flip through key flashcards.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('quiz')}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Take Quiz
              </button>
              <button
                onClick={() => setActiveTab('flashcards')}
                className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all cursor-pointer"
              >
                Review Flashcards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE PRACTICE QUIZ */}
      {activeTab === 'quiz' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-lg">
                Quick Understanding Check
              </h3>
            </div>
            {quizSubmitted && (
              <button
                onClick={handleResetQuiz}
                className="flex items-center space-x-1.5 text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry Quiz</span>
              </button>
            )}
          </div>

          <p className="text-base sm:text-lg font-bold text-white mb-6">
            {res.interactiveElements.practiceQuiz.question}
          </p>

          <div className="space-y-3 mb-6">
            {res.interactiveElements.practiceQuiz.options.map((opt, idx) => {
              const isSelected = selectedQuizOption === idx;
              const isCorrect = idx === res.interactiveElements.practiceQuiz.correctIndex;

              let btnStyle = 'border-slate-800 hover:bg-slate-850 text-slate-200 bg-slate-950/60';
              if (quizSubmitted) {
                if (isCorrect) {
                  btnStyle = 'border-emerald-500 bg-emerald-950/70 text-emerald-200 font-bold ring-2 ring-emerald-500/40';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'border-rose-500 bg-rose-950/70 text-rose-200 ring-2 ring-rose-500/40';
                } else {
                  btnStyle = 'border-slate-800 opacity-40 text-slate-500';
                }
              } else if (isSelected) {
                btnStyle = 'border-cyan-500 bg-cyan-950/70 text-cyan-200 ring-2 ring-cyan-500/40';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleQuizSelect(idx)}
                  disabled={quizSubmitted}
                  className={`w-full text-left p-4 rounded-2xl border text-sm sm:text-base flex items-start space-x-3.5 transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <span className="w-6 h-6 rounded-full border border-current font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 leading-snug">{opt}</span>
                  {quizSubmitted && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {quizSubmitted && isSelected && !isCorrect && (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation reveal */}
          {quizSubmitted && (
            <div
              className={`p-5 rounded-2xl border ${
                selectedQuizOption === res.interactiveElements.practiceQuiz.correctIndex
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-100'
                  : 'bg-rose-950/50 border-rose-800 text-rose-100'
              }`}
            >
              <div className="font-bold text-xs uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                {selectedQuizOption === res.interactiveElements.practiceQuiz.correctIndex ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Correct! Great work!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Concept Breakdown:</span>
                  </>
                )}
              </div>
              <p className="text-sm leading-relaxed">
                {res.interactiveElements.practiceQuiz.explanation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: 3D FLIP STUDY FLASHCARDS */}
      {activeTab === 'flashcards' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center border border-amber-800">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  Study Flashcards
                </h3>
                <p className="text-xs text-slate-400">
                  Card {currentCardIndex + 1} of {flashcards.length} &bull; Tap to flip
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggleCardMastered(currentCardIndex)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                masteredCards[currentCardIndex]
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{masteredCards[currentCardIndex] ? 'Mastered ✓' : 'Mark Mastered'}</span>
            </button>
          </div>

          {currentCard && (
            <div className="max-w-xl mx-auto">
              {/* Flip Card */}
              <div
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className="w-full min-h-[250px] rounded-3xl p-8 cursor-pointer select-none transition-all duration-300 shadow-2xl flex flex-col justify-between text-center border-2 border-slate-800 hover:border-cyan-500/50"
                style={{
                  backgroundColor: isCardFlipped ? '#030712' : '#0f172a',
                  color: '#ffffff',
                }}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="uppercase tracking-wider">
                    {isCardFlipped ? 'Answer' : 'Question / Concept'}
                  </span>
                  <span className="flex items-center space-x-1 text-cyan-400">
                    <RotateCw className="w-3 h-3" />
                    <span>Flip</span>
                  </span>
                </div>

                <div className="my-auto py-6">
                  <p className="text-lg sm:text-xl font-bold leading-relaxed">
                    {isCardFlipped ? currentCard.back : currentCard.front}
                  </p>
                </div>

                <div className="text-xs text-slate-500">
                  {isCardFlipped ? 'Click again to review front' : 'Tap to reveal answer'}
                </div>
              </div>

              {/* Hint Box */}
              {currentCard.hint && (
                <div className="mt-4 text-center">
                  {!showCardHint ? (
                    <button
                      onClick={() => setShowCardHint(true)}
                      className="text-xs text-slate-400 hover:text-cyan-400 font-semibold inline-flex items-center space-x-1 cursor-pointer"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      <span>Show Recall Hint</span>
                    </button>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/70 text-xs text-amber-200">
                      💡 <strong>Hint:</strong> {currentCard.hint}
                    </div>
                  )}
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => {
                    setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                    setIsCardFlipped(false);
                    setShowCardHint(false);
                  }}
                  disabled={currentCardIndex === 0}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30 hover:bg-slate-800 cursor-pointer"
                >
                  Previous
                </button>

                {/* Dots indicator */}
                <div className="flex space-x-1.5">
                  {flashcards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCurrentCardIndex(i);
                        setIsCardFlipped(false);
                        setShowCardHint(false);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === currentCardIndex
                          ? 'w-6 bg-cyan-500'
                          : masteredCards[i]
                          ? 'bg-emerald-400'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    setCurrentCardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                    setIsCardFlipped(false);
                    setShowCardHint(false);
                  }}
                  disabled={currentCardIndex === flashcards.length - 1}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-30 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CONTEXTUAL FOLLOW-UP CHAT */}
      {activeTab === 'chat' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center space-x-3 mb-6">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${persona.avatarColor} text-white flex items-center justify-center shadow-md`}
            >
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Chat with {persona.name} ({persona.role})
              </h3>
              <p className="text-xs text-slate-400">
                Ask clarifying questions, simpler analogies, or exam-specific tricks.
              </p>
            </div>
          </div>

          {/* Suggested Follow-Ups */}
          {res.interactiveElements.suggestedFollowUps &&
            res.interactiveElements.suggestedFollowUps.length > 0 && (
              <div className="mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Suggested Follow-Ups:
                </span>
                <div className="flex flex-wrap gap-2">
                  {res.interactiveElements.suggestedFollowUps.map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendChatMessage(promptText)}
                      disabled={isSendingChat}
                      className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer"
                    >
                      💬 {promptText}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Messages Container */}
          <div className="min-h-[220px] max-h-[380px] overflow-y-auto space-y-3 p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-4">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No follow-up messages yet. Ask {persona.name} anything below!
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                const isError = !isUser && msg.content.startsWith('Error:');

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {!isUser && (
                      <div className="flex items-center space-x-2 mb-1 px-1 text-[11px] text-slate-400">
                        <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${persona.avatarColor}`} />
                        <span className="font-semibold text-slate-300">{persona.name}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            setCopiedMessageId(msg.id);
                            setTimeout(() => setCopiedMessageId(null), 2000);
                          }}
                          className="text-slate-500 hover:text-cyan-300 transition-colors p-0.5 ml-1 cursor-pointer"
                          title="Copy reply"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}
                    <div
                      className={`max-w-[90%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                          : isError
                          ? 'bg-rose-950/60 border border-rose-800 text-rose-200 rounded-bl-none shadow-sm'
                          : 'bg-slate-900/95 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                      }`}
                    >
                      {renderChatMessageContent(msg.content, isUser)}
                    </div>
                  </div>
                );
              })
            )}
            {isSendingChat && (
              <div className="flex justify-start">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>{persona.name} is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask ${persona.name} anything about this...`}
              disabled={isSendingChat}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              type="submit"
              disabled={isSendingChat || !chatInput.trim()}
              className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: PERSONAL STUDY NOTES */}
      {activeTab === 'notes' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-lg">
                My Study Scratchpad
              </h3>
            </div>
            <span className="text-xs text-emerald-400 font-bold">
              Auto-saved
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Write your personal point notes and formulas to remember when reviewing this question.
          </p>

          <textarea
            value={notes}
            onChange={(e) => handleSaveNotes(e.target.value)}
            placeholder="• Key formula to remember...&#10;• Step 2 trap: watch the sign!&#10;• Exam tip from Thala..."
            rows={8}
            className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      )}
    </div>
  );
};
