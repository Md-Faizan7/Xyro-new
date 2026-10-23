import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Coffee,
  Brain,
  Sparkles,
  ChevronDown,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { PomodoroState } from '../types/study';
import { soundManager, sendDesktopNotification } from '../utils/sound';

interface PomodoroTimerProps {
  pomodoro: PomodoroState;
  onUpdatePomodoro: (updated: PomodoroState) => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  pomodoro,
  onUpdatePomodoro,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<any>(null);

  // Countdown timer tick effect
  useEffect(() => {
    if (pomodoro.isRunning) {
      timerRef.current = setInterval(() => {
        onUpdatePomodoro({
          ...pomodoro,
          secondsRemaining: Math.max(0, pomodoro.secondsRemaining - 1),
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pomodoro.isRunning, pomodoro.secondsRemaining]);

  // Handle completion when seconds hit 0
  useEffect(() => {
    if (pomodoro.isRunning && pomodoro.secondsRemaining === 0) {
      if (pomodoro.soundEnabled) {
        soundManager.playSessionEndChime();
      }

      const isFocus = pomodoro.mode === 'focus';
      const title = isFocus ? '🎯 Focus Session Complete!' : '☕ Break Ended!';
      const body = isFocus
        ? `You completed ${pomodoro.durationMinutes} minutes of focused study. Take a well-earned break!`
        : 'Break is over. Ready to dive back into your engineering topics?';

      if (pomodoro.notificationsEnabled) {
        sendDesktopNotification(title, body);
      }

      // Switch mode automatically
      if (isFocus) {
        const nextMode = (pomodoro.completedSessions + 1) % 4 === 0 ? 'long_break' : 'short_break';
        const nextDuration = nextMode === 'long_break' ? 15 : 5;
        onUpdatePomodoro({
          ...pomodoro,
          mode: nextMode,
          durationMinutes: nextDuration,
          secondsRemaining: nextDuration * 60,
          isRunning: false,
          totalFocusMinutes: pomodoro.totalFocusMinutes + pomodoro.durationMinutes,
          completedSessions: pomodoro.completedSessions + 1,
        });
      } else {
        onUpdatePomodoro({
          ...pomodoro,
          mode: 'focus',
          durationMinutes: 25,
          secondsRemaining: 25 * 60,
          isRunning: false,
        });
      }
    }
  }, [pomodoro.secondsRemaining, pomodoro.isRunning]);

  const toggleRun = () => {
    if (!pomodoro.isRunning) {
      soundManager.playStartTick();
    }
    onUpdatePomodoro({
      ...pomodoro,
      isRunning: !pomodoro.isRunning,
    });
  };

  const handleReset = () => {
    onUpdatePomodoro({
      ...pomodoro,
      isRunning: false,
      secondsRemaining: pomodoro.durationMinutes * 60,
    });
  };

  const handleSetMode = (mode: 'focus' | 'short_break' | 'long_break', minutes: number) => {
    onUpdatePomodoro({
      ...pomodoro,
      mode,
      durationMinutes: minutes,
      secondsRemaining: minutes * 60,
      isRunning: false,
    });
  };

  const handleCustomDuration = (delta: number) => {
    const newMins = Math.max(1, Math.min(120, pomodoro.durationMinutes + delta));
    onUpdatePomodoro({
      ...pomodoro,
      durationMinutes: newMins,
      secondsRemaining: newMins * 60,
      isRunning: false,
    });
  };

  const toggleNotifications = async () => {
    if (!pomodoro.notificationsEnabled) {
      if ('Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          onUpdatePomodoro({ ...pomodoro, notificationsEnabled: true });
        }
      } else {
        onUpdatePomodoro({ ...pomodoro, notificationsEnabled: true });
      }
    } else {
      onUpdatePomodoro({ ...pomodoro, notificationsEnabled: false });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const totalSecs = pomodoro.durationMinutes * 60;
  const progressPercent = totalSecs > 0 ? Math.round(((totalSecs - pomodoro.secondsRemaining) / totalSecs) * 100) : 0;

  return (
    <div className="relative">
      {/* Top Navbar Timer Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-xs cursor-pointer ${
          pomodoro.isRunning
            ? pomodoro.mode === 'focus'
              ? 'bg-cyan-950/90 border-cyan-500/80 text-cyan-300 ring-2 ring-cyan-500/30'
              : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 ring-2 ring-emerald-500/30'
            : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
        }`}
        title="Open Pomodoro Study Timer"
      >
        <span className="relative flex h-2 w-2">
          {pomodoro.isRunning && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                pomodoro.mode === 'focus' ? 'bg-cyan-400' : 'bg-emerald-400'
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              pomodoro.isRunning
                ? pomodoro.mode === 'focus'
                  ? 'bg-cyan-400'
                  : 'bg-emerald-400'
                : 'bg-slate-500'
            }`}
          />
        </span>

        <span className="tracking-tight">{formatTime(pomodoro.secondsRemaining)}</span>

        <span className="text-[10px] uppercase font-sans font-semibold text-slate-400 hidden sm:inline">
          {pomodoro.mode === 'focus' ? 'Focus' : 'Break'}
        </span>

        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 z-30 animate-in fade-in zoom-in-95 duration-100 text-slate-100 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Pomodoro Study Timer
                </span>
              </div>

              <div className="flex items-center space-x-1">
                {/* Sound Toggle */}
                <button
                  onClick={() =>
                    onUpdatePomodoro({ ...pomodoro, soundEnabled: !pomodoro.soundEnabled })
                  }
                  className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    pomodoro.soundEnabled
                      ? 'border-cyan-800 bg-cyan-950 text-cyan-400'
                      : 'border-slate-800 text-slate-500'
                  }`}
                  title={pomodoro.soundEnabled ? 'Chime sound active' : 'Chime muted'}
                >
                  {pomodoro.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {/* Notification Toggle */}
                <button
                  onClick={toggleNotifications}
                  className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                    pomodoro.notificationsEnabled
                      ? 'border-cyan-800 bg-cyan-950 text-cyan-400'
                      : 'border-slate-800 text-slate-500'
                  }`}
                  title={
                    pomodoro.notificationsEnabled
                      ? 'Desktop alerts active'
                      : 'Desktop alerts disabled'
                  }
                >
                  {pomodoro.notificationsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Mode Selectors */}
            <div className="grid grid-cols-3 gap-1.5 mb-4 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => handleSetMode('focus', 25)}
                className={`py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  pomodoro.mode === 'focus'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Focus (25m)
              </button>
              <button
                onClick={() => handleSetMode('short_break', 5)}
                className={`py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  pomodoro.mode === 'short_break'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Short (5m)
              </button>
              <button
                onClick={() => handleSetMode('long_break', 15)}
                className={`py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  pomodoro.mode === 'long_break'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Long (15m)
              </button>
            </div>

            {/* Big Countdown Timer Display */}
            <div className="text-center py-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 mb-4 relative overflow-hidden">
              {/* Progress bar background fill */}
              <div
                className={`absolute bottom-0 left-0 top-0 opacity-15 transition-all duration-1000 ${
                  pomodoro.mode === 'focus' ? 'bg-cyan-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />

              <div className="text-4xl font-extrabold font-mono tracking-tight text-white relative z-10">
                {formatTime(pomodoro.secondsRemaining)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1 relative z-10 flex items-center justify-center space-x-1.5">
                {pomodoro.mode === 'focus' ? (
                  <>
                    <Brain className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Deep Study Session</span>
                  </>
                ) : (
                  <>
                    <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rest & Recharge</span>
                  </>
                )}
                <span>&bull; {progressPercent}% elapsed</span>
              </div>
            </div>

            {/* Custom Minutes Quick Controls */}
            {!pomodoro.isRunning && (
              <div className="flex items-center justify-between text-xs px-2 mb-4 text-slate-400">
                <span>Duration: {pomodoro.durationMinutes} min</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleCustomDuration(-5)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    -5m
                  </button>
                  <button
                    onClick={() => handleCustomDuration(5)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  >
                    +5m
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleRun}
                className={`flex-1 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-md cursor-pointer ${
                  pomodoro.isRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/25'
                }`}
              >
                {pomodoro.isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Timer</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Session</span>
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="p-2.5 rounded-2xl border border-slate-800 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                title="Reset timer to beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Stats summary footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {pomodoro.completedSessions} sessions done
                </span>
              </div>
              <span className="font-bold text-cyan-400">
                {pomodoro.totalFocusMinutes} min total focus
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
