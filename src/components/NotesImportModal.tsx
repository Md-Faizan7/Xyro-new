import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Plus,
  Zap,
  Eye,
} from 'lucide-react';
import { ImportedNote } from '../types/study';

interface NotesImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ImportedNote[];
  onAddNote: (note: ImportedNote) => void;
  onRemoveNote: (id: string) => void;
  onClearAllNotes: () => void;
  onDiscoveredTopics?: (topics: string[]) => void;
}

export const NotesImportModal: React.FC<NotesImportModalProps> = ({
  isOpen,
  onClose,
  notes,
  onAddNote,
  onRemoveNote,
  onClearAllNotes,
  onDiscoveredTopics,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    noteName: string;
    summary?: string;
    topics: string[];
    keyFormulas: string[];
    isError?: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      reader.onload = () => {
        const result = reader.result as string;
        // Extract pure base64 without data:mime;base64, prefix for Gemini
        const base64Data = result.split(',')[1] || '';

        const newNote: ImportedNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          type: isPdf ? 'pdf' : isImage ? 'image' : 'text',
          mimeType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
          dataBase64: base64Data,
          previewUrl: isImage ? result : undefined,
          sizeFormatted: formatFileSize(file.size),
          timestamp: Date.now(),
        };

        onAddNote(newNote);
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleAddTextNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) return;

    const newNote: ImportedNote = {
      id: `note-${Date.now()}`,
      name: textTitle.trim() || 'Class Notes Scratchpad',
      type: 'text',
      mimeType: 'text/plain',
      textContent: textContent.trim(),
      sizeFormatted: formatFileSize(textContent.length),
      timestamp: Date.now(),
    };

    onAddNote(newNote);
    setTextTitle('');
    setTextContent('');
  };

  const handleAnalyzeNote = async (note: ImportedNote) => {
    setAnalyzingId(note.id);
    setAnalysisResult(null);
    try {
      const res = await fetch('/api/study/analyze-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('Analysis failed or server returned non-JSON.');
      }
      const data = await res.json();
      if (data.topics && Array.isArray(data.topics) && onDiscoveredTopics) {
        onDiscoveredTopics(data.topics);
      }
      setAnalysisResult({
        noteName: note.name,
        summary: data.summary,
        topics: data.topics || [],
        keyFormulas: data.keyFormulas || [],
      });
    } catch (e: any) {
      console.error(e);
      setAnalysisResult({
        noteName: note.name,
        summary: e.message || 'Could not scan notes.',
        topics: [],
        keyFormulas: [],
        isError: true,
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Import Class Notes & PDFs
              </h2>
              <p className="text-xs text-slate-400">
                Provide handwritten notes or lecture slides for contextual answers
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

        {/* Tabs: File Upload vs Text Notes */}
        <div className="px-6 pt-4 flex space-x-2 border-b border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 transition-all border-b-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Upload Handwritten / PDFs
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`pb-3 px-3 transition-all border-b-2 cursor-pointer ${
              activeTab === 'text'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Paste Text / Markdown Notes
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-6">
          {activeTab === 'upload' ? (
            <div>
              {/* Dropzone */}
              <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/60 hover:bg-slate-950">
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-cyan-950 text-cyan-400 flex items-center justify-center mb-3 shadow-inner border border-cyan-800/60">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Upload Scanned Handwritten Notes or PDF Slides
                </h3>
                <p className="text-xs text-slate-400 max-w-md mt-1">
                  Drag and drop files here or click to browse. Supports PDF lecture slides, scanned
                  notebook pages (PNG, JPG), and handwritten engineering diagrams.
                </p>
                <div className="mt-3 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 font-medium">
                  Multimodal Gemini 3.8 Flash automatically parses formulas and diagrams
                </div>
              </label>
            </div>
          ) : (
            <form onSubmit={handleAddTextNote} className="space-y-3">
              <input
                type="text"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="Note Title (e.g., Chapter 4: Thévenin & Norton Equations)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your lecture notes, textbook derivations, or custom formula sheet here..."
                rows={5}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={!textContent.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Save to Context Notes</span>
              </button>
            </form>
          )}

          {/* Scanned Analysis Result Banner */}
          {analysisResult && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
              analysisResult.isError
                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                : 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200'
            }`}>
              <div className="flex items-center justify-between font-bold text-white">
                <span>📘 Scanned from &ldquo;{analysisResult.noteName}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setAnalysisResult(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
              {analysisResult.summary && <p className="text-slate-300 leading-relaxed">{analysisResult.summary}</p>}
              {analysisResult.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-cyan-400 font-semibold mr-1">Discovered Topics:</span>
                  {analysisResult.topics.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-cyan-900/60 text-cyan-200 border border-cyan-700/60 text-[11px]">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Currently Attached Notes List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Active Context Notes ({notes.length})
                </h4>
              </div>
              {notes.length > 0 && (
                <button
                  onClick={onClearAllNotes}
                  className="text-xs text-rose-400 hover:underline font-bold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-slate-500 text-xs">
                No notes attached yet. Upload handwritten pages or PDF slides so your chatbot (Jarvis,
                Xyro, Thala, Vision) can reference them directly!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {note.previewUrl ? (
                        <img
                          src={note.previewUrl}
                          alt="handwritten preview"
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                      ) : note.type === 'pdf' ? (
                        <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800 flex items-center justify-center shrink-0 font-bold text-[10px]">
                          PDF
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800 flex items-center justify-center shrink-0 font-bold text-[10px]">
                          TXT
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="font-bold text-white truncate max-w-xs sm:max-w-md">
                          {note.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                          <span className="uppercase">{note.type}</span>
                          <span>&bull;</span>
                          <span>{note.sizeFormatted}</span>
                          <span>&bull;</span>
                          <span className="text-emerald-400 flex items-center space-x-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active in Prompt</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleAnalyzeNote(note)}
                        disabled={analyzingId === note.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-400 transition-all cursor-pointer"
                        title="Scan topics and formulas"
                      >
                        {analyzingId === note.id ? 'Scanning...' : 'Scan Topics'}
                      </button>
                      <button
                        onClick={() => onRemoveNote(note.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                        title="Remove note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center text-xs">
          <span className="text-slate-400">
            {notes.length} note{notes.length !== 1 ? 's' : ''} ready for chatbot context
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
