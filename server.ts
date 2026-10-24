import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side initialization of GoogleGenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const STUDY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questionSummary: {
      type: Type.STRING,
      description: 'A crisp 1-sentence distillation of what the user is asking.',
    },
    studyBuddyExplanation: {
      type: Type.OBJECT,
      properties: {
        buddyGreeting: {
          type: Type.STRING,
          description: 'A very short 1-sentence persona greeting (under 10 words).',
        },
        coreIntent: {
          type: Type.STRING,
          description: '1 to 2 concise bullet points explaining what is being solved.',
        },
        prerequisites: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '2 to 3 essential formulas or laws needed.',
        },
        intuitiveAnalogy: {
          type: Type.STRING,
          description: '1 concise real-world analogy sentence.',
        },
        thinkingRoadmap: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '2 to 3 short checkpoint action steps.',
        },
      },
      required: ['buddyGreeting', 'coreIntent', 'prerequisites', 'intuitiveAnalogy', 'thinkingRoadmap'],
    },
    geminiSolution: {
      type: Type.OBJECT,
      properties: {
        directAnswer: {
          type: Type.STRING,
          description: 'The clear numerical or conceptual direct answer in 1 sentence.',
        },
        stepByStep: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              explanation: { type: Type.STRING, description: '1 to 2 concise sentences explaining the step' },
              formulaOrCode: { type: Type.STRING, description: 'Optional math formula or code snippet' },
              tip: { type: Type.STRING, description: '1 short practical tip or caution' },
            },
            required: ['stepNumber', 'title', 'explanation'],
          },
          description: '2 to 3 concise steps maximum.',
        },
        keyTakeaway: {
          type: Type.STRING,
          description: '1 punchy golden rule to remember.',
        },
        commonPitfalls: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '1 to 2 frequent mistakes students make.',
        },
        memoryTrick: {
          type: Type.STRING,
          description: '1 brief catchy mnemonic or memory hook.',
        },
      },
      required: ['directAnswer', 'stepByStep', 'keyTakeaway', 'commonPitfalls', 'memoryTrick'],
    },
    interactiveElements: {
      type: Type.OBJECT,
      properties: {
        practiceQuiz: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Exactly 4 multiple choice options',
            },
            correctIndex: { type: Type.INTEGER, description: '0-based index of correct option' },
            explanation: { type: Type.STRING, description: 'Brief 1-sentence explanation of why it is right' },
          },
          required: ['question', 'options', 'correctIndex', 'explanation'],
        },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Question or concept on the front' },
              back: { type: Type.STRING, description: 'Clear concise definition on the back' },
              hint: { type: Type.STRING, description: 'Quick recall hint' },
            },
            required: ['front', 'back', 'hint'],
          },
          description: 'Exactly 2 high-yield review flashcards',
        },
        suggestedFollowUps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '2 short relevant follow-up questions',
        },
      },
      required: ['practiceQuiz', 'flashcards', 'suggestedFollowUps'],
    },
  },
  required: ['questionSummary', 'studyBuddyExplanation', 'geminiSolution', 'interactiveElements'],
};

// Persona instructions
function getPersonaPrompt(persona: string): string {
  switch (persona?.toLowerCase()) {
    case 'vision':
    case 'marcus':
      return 'You are Vision, a logical, precise, and first-principles academic architect. You break down questions using deep structural clarity and concise, high-signal bullet points.';
    case 'xyro':
    case 'zyro':
    case 'maya':
    case 'meow':
      return 'You are Meow (Xyro), an intuitive, creative, and visual learning companion. You specialize in punchy analogies, mental diagrams, and crystal-clear bullet points.';
    case 'thala':
    case 'sam':
      return 'You are Thala, the calm, clutch exam strategist. You deliver high-yield insights, spot trick questions instantly, and provide sharp, bulleted shortcuts.';
    case 'jarvis':
    case 'alex':
    default:
      return 'You are Jarvis, an ultra-sharp, energetic, and efficient AI study companion. You explain concepts cleanly, concisely, and directly without fluff.';
  }
}

// Resilient generator helper with automated fallback for high-demand spikes
async function generateWithFallback(options: {
  contents: any;
  config?: any;
  preferredModels?: string[];
}) {
  // Use active models (gemini-3.1-flash-lite first for lightning speed, fallback to gemini-3.8-flash)
  const models = options.preferredModels || ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  // Set thinkingBudget: 0 by default to prevent models from spending seconds generating hidden thoughts
  const mergedConfig = {
    thinkingConfig: { thinkingBudget: 0 },
    ...options.config,
  };

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: mergedConfig,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      console.warn(`[AI Studio] Model ${model} failed, attempting next model:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError;
}

// POST /api/study/solve - Two-phase Xyro Question Breakdown + Gemini Solution
app.post('/api/study/solve', async (req, res) => {
  try {
    const { question, subject, level, persona, mode, attachedNotes } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const personaGuide = getPersonaPrompt(persona || 'jarvis');

    const systemInstruction = `
${personaGuide}
You are operating the Xyro.ai two-stage learning engine.
CRITICAL SPEED & CONCISENESS RULES:
1. EXTREMELY RAPID & DIRECT: Start answering immediately. Zero conversational fluff, zero filler. Keep output compact so students get their answers in 1-2 seconds.
2. STRICT BULLET POINTS: Write sharp, compact bullet points (1-2 sentences per point).
3. NO ESSAYS OR TEXT WALLS: Give maximum technical signal with minimum words.
4. Keep stepByStep to 2-3 clear calculation/logic steps.
5. If student notes are attached, align with their formulas and terminology.

STRUCTURE:
1. FIRST STAGE (Stage 1: Question Breakdown):
   - buddyGreeting: 1 ultra-short greeting sentence (under 10 words).
   - coreIntent: 1-2 concise bullet points explaining what is being solved.
   - prerequisites: 2-3 essential formulas/laws (short bullet items).
   - intuitiveAnalogy: 1 punchy real-world analogy sentence.
   - thinkingRoadmap: 2-3 numbered action steps (e.g., "1. State given values", "2. Apply law", "3. Compute").

2. SECOND STAGE (Stage 2: Gemini Solution):
   - directAnswer: 1 direct takeaway or numerical value in 1 sentence.
   - stepByStep: Exactly 2 or 3 numbered steps. Each step has title, 1-2 sentence explanation, optional formula, and 1 short tip.
   - keyTakeaway: 1 high-yield golden rule.
   - commonPitfalls: 1-2 short mistakes to avoid.
   - memoryTrick: 1 brief mnemonic or hook.

Parameters:
- Target Subject: ${subject || 'General'}
- Academic Level: ${level || 'High School / College'}
- Study Mode: ${mode || 'Standard'}

Return strictly valid JSON adhering to the schema.
`;

    const userPrompt = `
Here is the student's question:
"${question.trim()}"

Please first explain the question and its underlying concept in brief points, and then provide Gemini's comprehensive step-by-step master solution with practice quiz and flashcards.
`;

    // Multimodal parts: support attached handwritten notes (images), PDFs, and text
    const parts: any[] = [];

    if (Array.isArray(attachedNotes) && attachedNotes.length > 0) {
      for (const note of attachedNotes) {
        if (note.dataBase64 && (note.mimeType?.startsWith('image/') || note.mimeType === 'application/pdf')) {
          parts.push({
            inlineData: {
              mimeType: note.mimeType,
              data: note.dataBase64,
            },
          });
          parts.push({
            text: `[Attached student file: "${note.name || 'Class Notes'}" (${note.mimeType}). Prioritize notations and context from this material.]`,
          });
        } else if (note.textContent) {
          parts.push({
            text: `--- Imported Student Note: ${note.name || 'Notes'} ---\n${note.textContent}\n--- End Note ---`,
          });
        }
      }
    }

    parts.push({ text: userPrompt });

    const response = await generateWithFallback({
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: STUDY_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 1200,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error('No response generated by model');
    }

    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/study/solve:', err);
    res.status(500).json({
      error: err.message || 'Failed to process question. Please try again.',
    });
  }
});

// POST /api/study/analyze-notes - Instant OCR & Topic extraction for uploaded notes (PDF/Handwritten/Text)
app.post('/api/study/analyze-notes', async (req, res) => {
  try {
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ error: 'Note data is required.' });
    }

    const parts: any[] = [];
    if (note.dataBase64 && (note.mimeType?.startsWith('image/') || note.mimeType === 'application/pdf')) {
      parts.push({
        inlineData: {
          mimeType: note.mimeType,
          data: note.dataBase64,
        },
      });
    } else if (note.textContent) {
      parts.push({ text: note.textContent });
    }

    parts.push({
      text: 'Analyze these uploaded notes (handwritten image or PDF). Extract a high-yield summary in 2-3 bullet points, list 3-5 key topics/concepts identified, and extract 2-4 important formulas or definitions found. Return valid JSON with keys: "summary" (string), "topics" (array of strings), and "keyFormulas" (array of strings).',
    });

    const response = await generateWithFallback({
      contents: { parts },
      config: {
        systemInstruction: 'You are a technical study notes analyzer. Extract crisp, clean, bullet-point summaries and formulas from student notes.',
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Error in /api/study/analyze-notes:', err);
    res.status(500).json({
      error: err.message || 'Failed to analyze note.',
    });
  }
});

// POST /api/study/transcribe-audio - Universal voice recognition audio transcription powered by Gemini
app.post('/api/study/transcribe-audio', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required.' });
    }

    const base64Clean = audioData.replace(/^data:[^;]+;base64,/, '');
    const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();

    const response = await generateWithFallback({
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: cleanMime,
              data: base64Clean,
            },
          },
          {
            text: 'Transcribe what the user says in this audio clip verbatim into clean text. It may be an academic study question, physics problem, or math concept. Return ONLY the transcribed words, nothing else. If there is no audible speech or only background silence, return an empty string.',
          },
        ],
      },
      config: {
        temperature: 0.1,
        maxOutputTokens: 250,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = (response.text || '').trim();
    res.json({ text });
  } catch (err: any) {
    console.error('Error in /api/study/transcribe-audio:', err);
    res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
});

// POST /api/study/chat - Contextual follow-up Q&A on the current study session
app.post('/api/study/chat', async (req, res) => {
  try {
    const { question, originalContext, chatHistory, userMessage, persona, attachedNotes } = req.body;

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const personaGuide = getPersonaPrompt(persona || 'xyro');

    // Extract a focused, brief topic summary instead of dumping raw complex JSON
    let topicSummary = '';
    if (originalContext) {
      if (typeof originalContext === 'string') {
        topicSummary = originalContext.slice(0, 300);
      } else {
        const directAns = originalContext.geminiSolution?.directAnswer;
        const takeaway = originalContext.geminiSolution?.keyTakeaway;
        const coreIntent = originalContext.studyBuddyExplanation?.coreIntent;
        const pieces: string[] = [];
        if (coreIntent) pieces.push(`Intent: ${coreIntent}`);
        if (directAns) pieces.push(`Direct takeaway: ${directAns}`);
        if (takeaway) pieces.push(`Key takeaway: ${takeaway}`);
        topicSummary = pieces.join(' | ') || 'Active study session';
      }
    }

    const systemInstruction = `
${personaGuide}
You are answering a student's follow-up question in the Xyro.ai chat assistant.

STUDY CONTEXT:
- Main Question Studied: "${question || 'General Study Session'}"
${topicSummary ? `- Concept Overview: ${topicSummary}` : ''}

CRITICAL RULES FOR CHAT REPLIES (ACCURACY & CLEAN POINT FORMAT):
1. DIRECT & ACCURATE ANSWER: Answer the student's exact question directly, accurately, and conceptually soundly. Do NOT go on unrelated tangents, repeat entire previous problem derivations, or write walls of text.
2. STRICT POINT FORMAT: Format your answer into 3 to 6 structured, bite-sized bullet points (using •).
3. BOLD TITLE FOR EACH POINT: Begin each bullet point with a bold title/category (e.g., "• **Effect on Stability**: Negative feedback stabilizes systems, whereas positive feedback often leads to oscillation or saturation.").
4. NO ASCII ART OR BLOCK DIAGRAMS: Under NO circumstance should you draw box diagrams, ASCII flowchart arrows, circuit lines, or text schematics (like "+----+", "| |", "----v", "-->"). They look like gibberish in this chat UI.
5. NO RAW LATEX OR UNRENDERED MATH: Do NOT use LaTeX commands like "\\frac{...}", "$$", "\\[", "\\]", "\\sum". If a formula is needed, write it in clean plain readable text (e.g. "Transfer Function = G / (1 + G*H)" or "Gain = A / (1 + A*B)").
6. NO MARKDOWN TABLES WITH PIPES: If comparing two concepts (e.g. positive vs negative feedback), format as distinct bullet points contrasting the two rather than raw markdown tables.
7. BRIEF & HIGH SIGNAL: Keep the entire answer between 80 to 220 words. Clean, engaging, and easy to read.
8. If imported student notes are attached, align with the student's notations and curriculum terms.
`;

    // Process attached notes into inline parts if provided
    const noteParts: any[] = [];
    if (Array.isArray(attachedNotes) && attachedNotes.length > 0) {
      for (const note of attachedNotes) {
        if (note.dataBase64 && (note.mimeType?.startsWith('image/') || note.mimeType === 'application/pdf')) {
          noteParts.push({
            inlineData: {
              mimeType: note.mimeType,
              data: note.dataBase64,
            },
          });
        }
      }
    }

    // Build raw turns from chatHistory
    const rawTurns: { role: 'user' | 'model'; parts: any[] }[] = [];

    if (Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        if (!msg || !msg.content || typeof msg.content !== 'string') continue;
        // Skip previously displayed client error messages
        if (msg.content.startsWith('Error:')) continue;
        const role: 'user' | 'model' =
          msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
        rawTurns.push({
          role,
          parts: [{ text: msg.content.trim() }],
        });
      }
    }

    const cleanUserMsg = userMessage.trim();
    // Only push userMessage if the last raw turn isn't already this identical userMessage
    const lastTurn = rawTurns[rawTurns.length - 1];
    if (!lastTurn || lastTurn.role !== 'user' || lastTurn.parts[0]?.text !== cleanUserMsg) {
      rawTurns.push({
        role: 'user',
        parts: [{ text: cleanUserMsg }],
      });
    }

    // Strictly consolidate consecutive turns with the same role into a single turn with merged parts
    // This guarantees alternating user <-> model turns as required by Gemini
    const contents: { role: 'user' | 'model'; parts: any[] }[] = [];
    for (const turn of rawTurns) {
      if (contents.length > 0 && contents[contents.length - 1].role === turn.role) {
        contents[contents.length - 1].parts.push(...turn.parts);
      } else {
        contents.push({ role: turn.role, parts: [...turn.parts] });
      }
    }

    // Ensure conversation starts with a user turn
    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }

    // Fallback if empty
    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: cleanUserMsg }],
      });
    }

    // Attach notes into the first user turn so the model has full context
    if (noteParts.length > 0 && contents.length > 0) {
      contents[0].parts.unshift(...noteParts);
    }

    const response = await generateWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
        maxOutputTokens: 500,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    let replyText = response.text || 'Here is more information on that topic.';

    // Sanitize any stray LaTeX or ASCII art if generated
    replyText = replyText
      // Convert \frac{A}{B} to (A)/(B)
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
      // Remove LaTeX math block symbols $$, \[, \], \(, \)
      .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
      .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
      .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
      // Strip ASCII box diagrams inside code blocks
      .replace(/```(?:text)?\s*[\r\n]+([\s\S]*?)```/g, (match, p1) => {
        if (p1.includes('+---') || p1.includes('|   ') || p1.includes('+===') || p1.includes('-->')) {
          return '';
        }
        return match;
      })
      // Filter out isolated ASCII border lines (+---+, |---|)
      .split('\n')
      .filter((line) => !/^[+\-| \t]{5,}$/.test(line.trim()))
      .join('\n')
      .trim();

    res.json({ reply: replyText });
  } catch (err: any) {
    console.error('Error in /api/study/chat:', err);
    res.status(500).json({
      error: err.message || 'Failed to answer follow-up question.',
    });
  }
});

// POST /api/study/hint - Socratic hint generator when student wants to try answering first
app.post('/api/study/hint', async (req, res) => {
  try {
    const { question, subject, level, hintNumber = 1 } = req.body;

    const systemInstruction = `
You are StudyBuddy in Socratic mode. The student wants to solve this question themselves and just wants Hint #${hintNumber}.
DO NOT give away the final numerical or conceptual answer!
Instead, point them toward the first step, a question to ask themselves, or the key equation to set up.
Keep it under 3-4 sentences, encouraging and thoughtful.
`;

    const response = await generateWithFallback({
      contents: `Question: "${question}" (Subject: ${subject}, Level: ${level})`,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ hint: response.text });
  } catch (err: any) {
    console.error('Error in /api/study/hint:', err);
    res.status(500).json({ error: err.message || 'Failed to generate hint.' });
  }
});

// Ensure unhandled /api/* routes return JSON rather than falling through to Vite HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Vite middleware in dev or static files in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StudyBuddy AI Server running on port ${PORT}`);
});
