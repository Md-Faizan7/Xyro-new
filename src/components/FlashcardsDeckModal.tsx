import React, { useState } from 'react';
import {
  X,
  Layers,
  RotateCw,
  Check,
  Shuffle,
  Lightbulb,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard } from '../types/study';

interface FlashcardsDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Flashcard[];
  onToggleMastered: (cardId: string) => void;
}

export const FlashcardsDeckModal: React.FC<FlashcardsDeckModalProps> = ({
  isOpen,
  onClose,
  cards,
  onToggleMastered,
}) => {
  const [deck, setDeck] = useState<Flashcard[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [filterUnmastered, setFilterUnmastered] = useState(false);

  React.useEffect(() => {
    setDeck(cards);
  }, [cards]);

  if (!isOpen) return null;

  const displayCards = filterUnmastered
    ? deck.filter((c) => !c.mastered)
    : deck;

  const currentCard = displayCards[currentIndex];
  const totalMastered = deck.filter((c) => c.mastered).length;
  const progressPercent = deck.length > 0 ? Math.round((totalMastered / deck.length) * 100) : 0;

  const handleShuffle = () => {
    const shuffled = [...displayCards].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleMasterCurrent = () => {
    if (!currentCard) return;
    onToggleMastered(currentCard.id);

    if (!currentCard.mastered) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4'],
        });
      } catch (e) {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Xyro Study Deck
              </h2>
              <p className="text-xs text-slate-400">
                {deck.length} flashcards collected across questions
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShuffle}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs flex items-center space-x-1 cursor-pointer"
              title="Shuffle Cards"
            >
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <span className="font-bold text-slate-400">Mastery:</span>
            <div className="w-32 sm:w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-bold text-cyan-400">
              {progressPercent}% ({totalMastered}/{deck.length})
            </span>
          </div>

          <button
            onClick={() => {
              setFilterUnmastered(!filterUnmastered);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              filterUnmastered
                ? 'bg-amber-950 border-amber-800 text-amber-300'
                : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {filterUnmastered ? 'Filter: Needs Review' : 'Filter: Unmastered'}
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 flex-1 flex flex-col items-center justify-center">
          {displayCards.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 text-cyan-400 mx-auto mb-2" />
              <h3 className="font-bold text-white text-base">
                No cards to review!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {filterUnmastered
                  ? 'All cards have been mastered!'
                  : 'Ask a question in Xyro to generate flashcards.'}
              </p>
            </div>
          ) : (
            <div className="w-full max-w-lg">
              {/* Flip Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[260px] rounded-3xl p-8 cursor-pointer select-none transition-all duration-300 shadow-2xl flex flex-col justify-between text-center border-2 border-slate-800 hover:border-cyan-500/50 bg-slate-950"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="uppercase tracking-wider">
                    {currentCard.topic || 'Flashcard'} &bull; {isFlipped ? 'Answer' : 'Question'}
                  </span>
                  <span className="flex items-center space-x-1 text-cyan-400">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </span>
                </div>

                <div className="my-auto py-6">
                  <p className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Card {currentIndex + 1} of {displayCards.length}
                  </span>
                  <span>{isFlipped ? 'Tap to view question' : 'Tap to reveal answer'}</span>
                </div>
              </div>

              {/* Hint */}
              {currentCard.hint && (
                <div className="mt-4 text-center">
                  {!showHint ? (
                    <button
                      onClick={() => setShowHint(true)}
                      className="text-xs text-slate-400 hover:text-cyan-400 font-bold inline-flex items-center space-x-1 cursor-pointer"
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
                    setCurrentIndex((prev) => Math.max(0, prev - 1));
                    setIsFlipped(false);
                    setShowHint(false);
                  }}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30 hover:bg-slate-800 flex items-center space-x-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <button
                  onClick={handleMasterCurrent}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    currentCard.mastered
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{currentCard.mastered ? 'Mastered ✓' : 'Mark Mastered'}</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentIndex((prev) => Math.min(displayCards.length - 1, prev + 1));
                    setIsFlipped(false);
                    setShowHint(false);
                  }}
                  disabled={currentIndex === displayCards.length - 1}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-30 flex items-center space-x-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
