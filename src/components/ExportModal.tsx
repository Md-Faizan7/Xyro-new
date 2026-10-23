import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Printer,
  FileText,
  Clock,
  List,
  Layers,
  Sparkles,
  Share2,
} from 'lucide-react';
import { SavedSession, PomodoroState, ImportedNote } from '../types/study';
import { PERSONAS } from '../data/constants';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SavedSession[];
  pomodoro: PomodoroState;
  notes: ImportedNote[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  sessions,
  pomodoro,
  notes,
}) => {
  const [exportType, setExportType] = useState<'all' | 'bullets_only' | 'time_only'>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate exported content based on selection
  const generateExportContent = () => {
    const dateStr = new Date().toLocaleDateString();
    let doc = '';

    if (exportType === 'time_only') {
      doc += `# ⏱️ Xyro Study Time Report - ${dateStr}\n\n`;
      doc += `## Focus Statistics\n`;
      doc += `- **Total Active Focus Time**: ${pomodoro.totalFocusMinutes} minutes (~${(pomodoro.totalFocusMinutes / 60).toFixed(1)} hours)\n`;
      doc += `- **Completed Pomodoro Sessions**: ${pomodoro.completedSessions}\n`;
      doc += `- **Questions & Topics Solved**: ${sessions.length}\n`;
      doc += `- **Attached Study Notes**: ${notes.length}\n\n`;
      doc += `### Topics Studied in this Period\n`;
      sessions.forEach((s, idx) => {
        doc += `${idx + 1}. **${s.subject.toUpperCase()}**: "${s.question}" (${new Date(s.timestamp).toLocaleTimeString()})\n`;
      });
      return doc;
    }

    if (exportType === 'bullets_only') {
      doc += `# ⚡ High-Yield Revision Sheet (Main Topics & Points)\nGenerated on ${dateStr} via Xyro.ai\n\n`;
      doc += `> **Active Study Time Log**: ${pomodoro.totalFocusMinutes} min focus | ${pomodoro.completedSessions} sessions | ${sessions.length} topics solved\n\n`;

      sessions.forEach((s, idx) => {
        const p = PERSONAS[s.persona] || PERSONAS.jarvis;
        const res = s.response;
        doc += `## ${idx + 1}. [${s.subject.toUpperCase()}] ${s.question}\n\n`;
        doc += `### 🎯 Core Problem Intent\n${res.studyBuddyExplanation.coreIntent}\n\n`;
        doc += `### 💡 Intuitive Analogy\n${res.studyBuddyExplanation.intuitiveAnalogy}\n\n`;
        doc += `### 🚀 Direct Answer\n${res.geminiSolution.directAnswer}\n\n`;
        doc += `### 🔑 Golden Key Takeaway\n${res.geminiSolution.keyTakeaway}\n\n`;

        if (res.geminiSolution.memoryTrick) {
          doc += `### 🧠 Memory Hook\n"${res.geminiSolution.memoryTrick}"\n\n`;
        }

        if (res.geminiSolution.commonPitfalls?.length) {
          doc += `### ⚠️ Traps to Avoid\n`;
          res.geminiSolution.commonPitfalls.forEach((pit) => {
            doc += `- ${pit.replace(/^[•\-\*]\s*/, '')}\n`;
          });
          doc += `\n`;
        }

        if (s.userNotes?.trim()) {
          doc += `### 📝 Student Notes\n${s.userNotes}\n\n`;
        }

        doc += `---\n\n`;
      });
      return doc;
    }

    // Default: 'all'
    doc += `# 📘 Xyro Comprehensive Engineering & Study Archive\nExported: ${dateStr}\n\n`;
    doc += `## ⏱️ Pomodoro Study Time Log\n`;
    doc += `- **Total Focus Duration**: ${pomodoro.totalFocusMinutes} minutes (${(pomodoro.totalFocusMinutes / 60).toFixed(1)} hrs)\n`;
    doc += `- **Completed Focus Cycles**: ${pomodoro.completedSessions}\n`;
    doc += `- **Total Topics Unpacked**: ${sessions.length}\n`;
    doc += `- **Imported Context Notes**: ${notes.length} documents attached\n\n`;
    doc += `---\n\n`;

    sessions.forEach((s, idx) => {
      const p = PERSONAS[s.persona] || PERSONAS.jarvis;
      const res = s.response;
      doc += `# Problem #${idx + 1}: ${s.question}\n`;
      doc += `**Subject**: ${s.subject.toUpperCase()} | **Level**: ${s.level} | **Chatbot**: ${p.name}\n\n`;

      doc += `## Stage 1: ${p.name}'s Point Breakdown\n`;
      doc += `**Reaction**: "${res.studyBuddyExplanation.buddyGreeting}"\n\n`;
      doc += `### What This Question Is Really Asking\n${res.studyBuddyExplanation.coreIntent}\n\n`;
      doc += `### Prerequisite Concepts\n`;
      res.studyBuddyExplanation.prerequisites.forEach((pr) => {
        doc += `- ${pr}\n`;
      });
      doc += `\n### Intuitive Analogy\n${res.studyBuddyExplanation.intuitiveAnalogy}\n\n`;
      doc += `### Thinking Roadmap\n`;
      res.studyBuddyExplanation.thinkingRoadmap.forEach((rm) => {
        doc += `${rm}\n`;
      });
      doc += `\n`;

      doc += `## Xyro's Master Solution\n`;
      doc += `### Direct Answer\n${res.geminiSolution.directAnswer}\n\n`;
      doc += `### Derivation Steps\n`;
      res.geminiSolution.stepByStep.forEach((st) => {
        doc += `#### Step ${st.stepNumber}: ${st.title}\n`;
        doc += `${st.explanation}\n`;
        if (st.formulaOrCode) {
          doc += `\`\`\`\n${st.formulaOrCode}\n\`\`\`\n`;
        }
        if (st.tip) {
          doc += `*Tip*: ${st.tip}\n`;
        }
        doc += `\n`;
      });

      doc += `### Golden Key Takeaway\n${res.geminiSolution.keyTakeaway}\n\n`;

      if (res.geminiSolution.commonPitfalls?.length) {
        doc += `### Traps & Common Mistakes\n`;
        res.geminiSolution.commonPitfalls.forEach((pit) => {
          doc += `- ${pit}\n`;
        });
        doc += `\n`;
      }

      if (res.geminiSolution.memoryTrick) {
        doc += `### Memory Trick\n"${res.geminiSolution.memoryTrick}"\n\n`;
      }

      if (s.userNotes?.trim()) {
        doc += `### Personal Scratchpad Notes\n${s.userNotes}\n\n`;
      }

      doc += `========================================================\n\n`;
    });

    return doc;
  };

  const handleCopy = () => {
    const text = generateExportContent();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (ext: 'md' | 'txt') => {
    const text = generateExportContent();
    const filename = `zyro-study-${exportType}-${new Date().toISOString().slice(0, 10)}.${ext}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const text = generateExportContent();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Xyro Study Export</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; }
            h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            h2 { color: #0369a1; margin-top: 24px; }
            h3 { color: #334155; margin-top: 16px; }
            code, pre { background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
            pre { padding: 12px; overflow-x: auto; }
            ul, ol { padding-left: 20px; }
          </style>
        </head>
        <body>
          <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Export Study Data & Revision Sheet
              </h2>
              <p className="text-xs text-slate-400">
                Download your Pomodoro focus log, questions, solutions, and bullet points
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Type Selection */}
        <div className="p-6 space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Select Export Format
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Option 1: All Data */}
            <div
              onClick={() => setExportType('all')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                exportType === 'all'
                  ? 'border-cyan-500 bg-cyan-950/60 ring-1 ring-cyan-500/40 text-white'
                  : 'border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-xs sm:text-sm text-cyan-400 mb-1">
                <FileText className="w-4 h-4" />
                <span>Export All</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Full archive: Pomodoro study log, Stage 1 breakdowns, Gemini solutions, and personal notes.
              </p>
            </div>

            {/* Option 2: Main Topics & Bullets Only */}
            <div
              onClick={() => setExportType('bullets_only')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                exportType === 'bullets_only'
                  ? 'border-cyan-500 bg-cyan-950/60 ring-1 ring-cyan-500/40 text-white'
                  : 'border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-xs sm:text-sm text-amber-400 mb-1">
                <List className="w-4 h-4" />
                <span>Main Topics & Points</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                High-yield revision sheet: Only core bullet points, golden takeaways, and formula mnemonics.
              </p>
            </div>

            {/* Option 3: Time Log Only */}
            <div
              onClick={() => setExportType('time_only')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                exportType === 'time_only'
                  ? 'border-cyan-500 bg-cyan-950/60 ring-1 ring-cyan-500/40 text-white'
                  : 'border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-xs sm:text-sm text-emerald-400 mb-1">
                <Clock className="w-4 h-4" />
                <span>Study Time Log</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Summary of active Pomodoro focus minutes, completed sessions, and study timestamps.
              </p>
            </div>
          </div>

          {/* Preview snippet */}
          <div className="mt-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Document Preview
            </span>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {generateExportContent().slice(0, 700)}...
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center space-x-1.5 cursor-pointer"
              title="Print document or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDownload('txt')}
              className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
            >
              .TXT
            </button>
            <button
              onClick={() => handleDownload('md')}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-md shadow-cyan-500/25 flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download .MD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
