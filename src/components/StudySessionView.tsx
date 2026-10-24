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
  Mic,
  MicOff,
  Radio,
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
import { voiceRecognition } from '../utils/voiceRecognition';

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
  const [activeSpokenMessageId, setActiveSpokenMessageId] = useState<string | null>(null);
  const [autoSpeakReply, setAutoSpeakReply] = useState(true);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
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
  const theme = THEMES[currentTheme] || THEMES.slate;
  const res = session.response;

  // Sync speech state
  useEffect(() => {
    speechManager.onStateChange((speaking, activeId) => {
      setIsSpeaking(speaking);
      setActiveSpokenMessageId(activeId);
    });
    return () => {
      speechManager.stop();
      voiceRecognition.stop();
    };
  }, []);

  const handleToggleVoiceListen = async () => {
    if (isVoiceListening || isVoiceProcessing) {
      voiceRecognition.stop();
      setIsVoiceListening(false);
      setInterimVoiceText('');
    } else {
      speechManager.stop();
      setVoiceError(null);
      setInterimVoiceText('');
      setIsVoiceProcessing(false);

      const started = await voiceRecognition.start({
        onStart: () => {
          setIsVoiceListening(true);
          setVoiceError(null);
        },
        onInterim: (interim) => {
          setInterimVoiceText(interim);
        },
        onFinal: (finalTranscript) => {
          setChatInput((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript}` : finalTranscript;
          });
          setInterimVoiceText('');
        },
        onProcessing: (proc) => {
          setIsVoiceProcessing(proc);
        },
        onError: (err) => {
          setVoiceError(err);
          setIsVoiceListening(false);
          setIsVoiceProcessing(false);
          setInterimVoiceText('');
        },
        onEnd: () => {
          setIsVoiceListening(false);
          setIsVoiceProcessing(false);
          setInterimVoiceText('');
        },
      });

      if (!started && !voiceRecognition.isSupported()) {
        setVoiceError('Microphone access is not supported in this browser. Please use Google Chrome, Edge, or Safari.');
      }
    }
  };

  const handleToggleSpeech = () => {
    if (isSpeaking && activeSpokenMessageId === 'main-solution') {
      speechManager.stop();
    } else {
      const textToRead = `${persona.name} says: ${res.studyBuddyExplanation.buddyGreeting}. Direct solution: ${res.geminiSolution.directAnswer}. Key takeaway: ${res.geminiSolution.keyTakeaway}`;
      speechManager.speak(textToRead, session.persona, 'main-solution');
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

      // Automatically speak reply if voice answers are toggled ON
      if (autoSpeakReply) {
        speechManager.speak(botMsg.content, session.persona, botMsg.id);
      }
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
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.hint) {
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
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0" />
              <span className="text-sm leading-relaxed text-zinc-300">{cleanLine}</span>
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
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
              {session.subject}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-normal bg-zinc-800/60 text-zinc-400 border border-zinc-700/60">
              {session.level}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-medium border border-zinc-700 bg-zinc-800 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <span className="text-zinc-200">{persona.name}</span>
            </span>
            {session.mode === 'socratic' && (
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                Socratic Mode
              </span>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={handleToggleSpeech}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1.5 transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-rose-950/80 border-rose-800 text-rose-300 animate-pulse'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
              title={isSpeaking ? 'Stop read aloud' : 'Listen to explanation'}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-400" />}
              <span className="hidden sm:inline">{isSpeaking ? 'Stop' : 'Read Points'}</span>
            </button>

            <button
              onClick={handleBookmarkToggle}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                session.bookmarked
                  ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
              title="Bookmark session"
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={handleCopySummary}
              className="p-2 rounded-lg border bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-all cursor-pointer"
              title="Copy point summary"
            >
              {copied ? <Check className="w-4 h-4 text-zinc-200" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* The Question */}
        <h2 className="text-lg sm:text-xl font-bold text-zinc-100 leading-snug">
          &ldquo;{session.question}&rdquo;
        </h2>

        {/* Short Goal Pill */}
        {res.questionSummary && (
          <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 font-normal">
            <span className="font-semibold text-zinc-200">Core Goal:</span>
            <span>{res.questionSummary}</span>
          </div>
        )}
      </div>

      {/* Socratic Hint Box if applicable */}
      {session.mode === 'socratic' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-zinc-300" />
              <h3 className="font-semibold text-zinc-100 text-sm">
                Socratic Guided Thinking
              </h3>
            </div>
            <button
              onClick={handleRequestHint}
              disabled={isLoadingHint}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoadingHint ? 'Generating hint...' : `Get Hint #${socraticHints.length + 1}`}
            </button>
          </div>

          <p className="text-xs text-zinc-400 mb-2">
            Try answering yourself using {persona.name}&apos;s guidance before viewing full solution.
          </p>

          {socraticHints.length > 0 && (
            <div className="space-y-2 mt-3">
              {socraticHints.map((hint, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
                  <span className="font-semibold text-zinc-200">Hint {idx + 1}: </span>
                  {hint}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* NAVIGATION TABS: Point Breakdown, Quiz, Flashcards, Chat, Notes */}
      <div className="flex items-center space-x-1.5 overflow-x-auto p-1 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs sm:text-sm font-medium">
        <button
          onClick={() => setActiveTab('solution')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'solution'
              ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700/80 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Point Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700/80 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-300" />
          <span>Quick Quiz</span>
          {session.quizResult && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                session.quizResult.isCorrect ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'flashcards'
              ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700/80 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-zinc-300" />
          <span>Cards ({flashcards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700/80 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />
          <span>Chat with {persona.name}</span>
          {chatMessages.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold border border-zinc-700">
              {chatMessages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700/80 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-zinc-300" />
          <span>My Notes {notes.trim() ? '•' : ''}</span>
        </button>
      </div>

      {/* TAB 1: BRIEF POINT FORMAT (XYRO'S SOLUTION) */}
      {activeTab === 'solution' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* ========================================================= */}
          {/* XYRO'S COMPREHENSIVE SOLUTION IN CLEAN POINTS */}
          {/* ========================================================= */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 sm:p-7 shadow-sm">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-zinc-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700">
                      Step-by-Step
                    </span>
                    <h3 className="font-bold text-zinc-100 text-base sm:text-lg">
                      Solution
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Direct answer &bull; Point-by-point derivation &bull; Golden takeaways
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium">
                Master Solution
              </span>
            </div>

            {/* Direct Answer Highlight */}
            <div className="mb-5 p-4 sm:p-5 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-zinc-300" />
                <span>Direct Answer</span>
              </div>
              <p className="text-base font-semibold text-zinc-100 leading-relaxed">
                {res.geminiSolution.directAnswer}
              </p>
            </div>

            {/* Step-by-Step Points */}
            <div className="space-y-3 mb-5">
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
                Derivation & Solution Steps
              </h4>

              {res.geminiSolution.stepByStep.map((step) => (
                <div
                  key={step.stepNumber}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5 shadow-xs"
                >
                  <div className="flex items-center space-x-2.5 mb-2.5">
                    <span className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center justify-center shadow-xs">
                      {step.stepNumber}
                    </span>
                    <h5 className="font-semibold text-zinc-100 text-sm sm:text-base">
                      {step.title}
                    </h5>
                  </div>

                  {/* Bullet format points for the step */}
                  <div className="pl-8">
                    {renderPointFormat(step.explanation)}

                    {/* Formula or Code Snippet */}
                    {step.formulaOrCode && (
                      <div className="mt-2.5 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs sm:text-sm overflow-x-auto">
                        <code>{step.formulaOrCode}</code>
                      </div>
                    )}

                    {/* Tip */}
                    {step.tip && (
                      <div className="mt-2.5 flex items-start space-x-2 text-xs text-zinc-300 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                        <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-400" />
                        <span>{step.tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Key Golden Takeaway Banner */}
            <div className="mb-3.5 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center space-x-2 text-zinc-300 font-semibold text-[11px] uppercase tracking-wider mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Key Takeaway</span>
              </div>
              <p className="text-sm text-zinc-200 font-medium leading-relaxed">
                • {res.geminiSolution.keyTakeaway}
              </p>
            </div>

            {/* Common Pitfalls in bullet format */}
            {res.geminiSolution.commonPitfalls && res.geminiSolution.commonPitfalls.length > 0 && (
              <div className="mb-3.5 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-center space-x-2 text-zinc-400 font-medium text-[11px] uppercase tracking-wider mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Traps & Mistakes To Avoid</span>
                </div>
                <div className="space-y-1.5 text-xs sm:text-sm text-zinc-300">
                  {res.geminiSolution.commonPitfalls.map((pitfall, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-zinc-500 font-bold mt-0.5">•</span>
                      <span>{pitfall.replace(/^[•\-\*]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Trick */}
            {res.geminiSolution.memoryTrick && (
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center space-x-3">
                <Target className="w-4 h-4 text-zinc-400 shrink-0" />
                <div className="text-xs sm:text-sm text-zinc-300">
                  <span className="font-semibold text-zinc-200 mr-2">Memory Hook:</span>
                  <span>&ldquo;{res.geminiSolution.memoryTrick}&rdquo;</span>
                </div>
              </div>
            )}
          </section>

          {/* Quick Quiz & Flashcard Navigation bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold text-zinc-100 text-sm">
                Test your knowledge on this problem
              </h4>
              <p className="text-xs text-zinc-400">
                Try the 1-question quiz or flip through key flashcards.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('quiz')}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Take Quiz
              </button>
              <button
                onClick={() => setActiveTab('flashcards')}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition-all cursor-pointer"
              >
                Review Cards
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

      {/* TAB 4: CONTEXTUAL FOLLOW-UP CHAT WITH VOICE */}
      {activeTab === 'chat' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${persona.avatarColor} text-white flex items-center justify-center shadow-md shrink-0`}
              >
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <span>Chat with {persona.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-normal">
                    {persona.role}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Ask clarifying questions via voice or text &bull; Receive structured point breakdowns.
                </p>
              </div>
            </div>

            {/* Voice Response Controls */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = !autoSpeakReply;
                  setAutoSpeakReply(next);
                  if (!next && isSpeaking) {
                    speechManager.stop();
                  }
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  autoSpeakReply
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Automatically vocalize assistant replies aloud"
              >
                {autoSpeakReply ? (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Voice Answer: {autoSpeakReply ? 'ON' : 'OFF'}</span>
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={() => speechManager.stop()}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm animate-pulse"
                  title="Stop speaking"
                >
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stop Voice</span>
                </button>
              )}
            </div>
          </div>

          {/* Voice Error Notice */}
          {voiceError && (
            <div className="mb-4 p-3 rounded-2xl bg-amber-950/50 border border-amber-800 text-amber-200 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{voiceError}</span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                className="text-amber-400 hover:text-white font-bold text-xs ml-3 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

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
              <div className="text-center py-10 text-slate-500 text-xs">
                <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <Mic className="w-5 h-5" />
                </div>
                <p className="font-medium text-slate-400">No messages yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Type or click the microphone to ask {persona.name} anything about this problem!
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                const isError = !isUser && msg.content.startsWith('Error:');
                const isCurrentlySpeakingThis = isSpeaking && activeSpokenMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    {!isUser && (
                      <div className="flex items-center space-x-2 mb-1 px-1 text-[11px] text-slate-400">
                        <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${persona.avatarColor}`} />
                        <span className="font-semibold text-slate-300">{persona.name}</span>

                        {/* Text-to-speech button for this message */}
                        {!isError && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isCurrentlySpeakingThis) {
                                speechManager.stop();
                              } else {
                                speechManager.speak(msg.content, session.persona, msg.id);
                              }
                            }}
                            className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium flex items-center space-x-1 transition-all cursor-pointer ml-1 ${
                              isCurrentlySpeakingThis
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-600 shadow-xs'
                                : 'text-slate-400 hover:text-cyan-300 border-slate-800 hover:border-slate-700'
                            }`}
                            title={isCurrentlySpeakingThis ? 'Stop voice reading' : 'Read answer aloud'}
                          >
                            {isCurrentlySpeakingThis ? (
                              <>
                                <div className="flex items-end space-x-0.5 h-2.5">
                                  <span className="w-0.5 h-2.5 bg-cyan-400 animate-pulse" />
                                  <span className="w-0.5 h-1.5 bg-cyan-300 animate-pulse [animation-delay:0.15s]" />
                                  <span className="w-0.5 h-2 bg-cyan-400 animate-pulse [animation-delay:0.3s]" />
                                </div>
                                <span className="text-[10px]">Playing</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-cyan-400" />
                                <span className="text-[10px]">Listen</span>
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            setCopiedMessageId(msg.id);
                            setTimeout(() => setCopiedMessageId(null), 2000);
                          }}
                          className="text-slate-500 hover:text-cyan-300 transition-colors p-0.5 cursor-pointer"
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
                      className={`max-w-[90%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed transition-all ${
                        isUser
                          ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                          : isError
                          ? 'bg-rose-950/60 border border-rose-800 text-rose-200 rounded-bl-none shadow-sm'
                          : isCurrentlySpeakingThis
                          ? 'bg-slate-900 border-2 border-cyan-500/60 text-slate-100 rounded-bl-none shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
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

          {/* Active Voice Listening Banner */}
          {isVoiceListening && (
            <div className="mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border border-cyan-500/50 shadow-lg animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-3">
                  <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
                    <Mic className="w-4 h-4 text-rose-400 relative z-10" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white">Listening... Speak now</span>
                      <div className="flex items-end space-x-0.5 h-3">
                        <span className="w-1 h-2 bg-cyan-400 animate-bounce" />
                        <span className="w-1 h-3.5 bg-cyan-300 animate-bounce [animation-delay:0.12s]" />
                        <span className="w-1 h-1.5 bg-cyan-400 animate-bounce [animation-delay:0.24s]" />
                        <span className="w-1 h-3 bg-cyan-300 animate-bounce [animation-delay:0.36s]" />
                      </div>
                    </div>
                    <p className="text-[11px] text-cyan-300/90 mt-0.5 truncate max-w-md">
                      {chatInput || interimVoiceText || 'e.g. "Can you explain this step with an intuitive analogy?"'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      voiceRecognition.stop();
                      setIsVoiceListening(false);
                      if (chatInput.trim()) {
                        handleSendChatMessage(chatInput.trim());
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send Voice Query</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      voiceRecognition.stop();
                      setIsVoiceListening(false);
                      setInterimVoiceText('');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer"
                  >
                    Done Speaking
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chat Input with Microphone */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isVoiceListening) {
                voiceRecognition.stop();
                setIsVoiceListening(false);
              }
              handleSendChatMessage();
            }}
            className="flex items-center space-x-2"
          >
            {/* Microphone Toggle Button */}
            <button
              type="button"
              onClick={handleToggleVoiceListen}
              disabled={isSendingChat}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isVoiceProcessing
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                  : isVoiceListening
                  ? 'bg-rose-900/80 text-rose-100 border-rose-700 animate-pulse'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
              title={isVoiceListening ? 'Stop recording voice' : 'Speak your question via microphone'}
            >
              {isVoiceProcessing ? (
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : isVoiceListening ? (
                <MicOff className="w-4 h-4 text-rose-300" />
              ) : (
                <Mic className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                isVoiceProcessing
                  ? 'Transcribing audio...'
                  : isVoiceListening
                  ? 'Listening to speech... speak your question now'
                  : `Ask ${persona.name} a question... (Type or use mic)`
              }
              disabled={isSendingChat || isVoiceProcessing}
              className={`flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all ${
                isVoiceListening
                  ? 'border-rose-500 ring-1 ring-rose-500/50'
                  : 'border-zinc-800 focus:ring-1 focus:ring-zinc-600'
              }`}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSendingChat || isVoiceProcessing || (!chatInput.trim() && !interimVoiceText.trim())}
              className="p-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 font-semibold disabled:opacity-40 transition-all cursor-pointer shrink-0 shadow-xs"
              title="Send message"
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
