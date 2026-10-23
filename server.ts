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
          description: 'A warm, encouraging persona-tailored greeting and reaction to the problem.',
        },
        coreIntent: {
          type: Type.STRING,
          description: 'Deconstruct what this question is really asking. Clarify tricky terms, assumptions, and remove confusion.',
        },
        prerequisites: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of foundational concepts, laws, or formulas needed before solving.',
        },
        intuitiveAnalogy: {
          type: Type.STRING,
          description: 'A vivid, relatable real-world metaphor or intuition that makes the concept click.',
        },
        thinkingRoadmap: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 to 5 logical checkpoints for how to think through and tackle this problem.',
        },
      },
      required: ['buddyGreeting', 'coreIntent', 'prerequisites', 'intuitiveAnalogy', 'thinkingRoadmap'],
    },
    geminiSolution: {
      type: Type.OBJECT,
      properties: {
        directAnswer: {
          type: Type.STRING,
          description: 'The clear, direct takeaway or numerical/conceptual final answer.',
        },
        stepByStep: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              title: { type: Type.STRING },
              explanation: { type: Type.STRING },
              formulaOrCode: { type: Type.STRING, description: 'Optional math formula, equation, or code snippet if relevant' },
              tip: { type: Type.STRING, description: 'Insightful hint or caution for this step' },
            },
            required: ['stepNumber', 'title', 'explanation'],
          },
          description: 'Detailed, step-by-step rigorous solution.',
        },
        keyTakeaway: {
          type: Type.STRING,
          description: 'The most important lesson, rule, or concept to remember for future tests.',
        },
        commonPitfalls: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '1 to 3 frequent mistakes students make with this problem.',
        },
        memoryTrick: {
          type: Type.STRING,
          description: 'A mnemonic, rhyme, or mental hook to never forget this concept.',
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
            explanation: { type: Type.STRING, description: 'Explanation of why the correct option is right' },
          },
          required: ['question', 'options', 'correctIndex', 'explanation'],
        },
        flashcards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING, description: 'Question or concept on the front' },
              back: { type: Type.STRING, description: 'Clear concise answer or definition on the back' },
              hint: { type: Type.STRING, description: 'Quick recall hint' },
            },
            required: ['front', 'back', 'hint'],
          },
          description: '2 to 3 high-yield review flashcards for spaced repetition',
        },
        suggestedFollowUps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 relevant follow-up questions the student might want to ask next',
        },
      },
      required: ['practiceQuiz', 'flashcards', 'suggestedFollowUps'],
    },
  },
  required: ['questionSummary', 'studyBuddyExplanation', 'geminiSolution', 'interactiveElements'],
};

// Persona instructions
function getPersonaPrompt(persona: string): string {
  switch (persona) {
    case 'vision':
    case 'marcus':
      return 'You are Vision, a logical, precise, and first-principles academic architect. You break down questions using deep structural clarity and concise, high-signal bullet points.';
    case 'xyro':
    case 'zyro':
    case 'maya':
      return 'You are Xyro, an intuitive, creative, and visual learning companion. You specialize in punchy analogies, mental diagrams, and crystal-clear bullet points.';
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
  const models = options.preferredModels || ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      return response;
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
CRITICAL FORMATTING & LENGTH RULES:
1. STRICTLY BRIEF & INFORMATIVE: Avoid long, congested paragraphs or walls of text!
2. USE BULLET POINTS & POINT FORMAT: Present thoughts as clean, bite-sized bullet points.
3. Keep each explanation step under 2 to 3 concise sentences.
4. Highlight key terms and equations cleanly.
5. If the student provides imported class notes, lecture slides (PDFs), or handwritten notes (images), closely align with their specific course notations, definitions, diagram labels, and curriculum context!

STRUCTURE:
1. FIRST STAGE (Stage 1: Question Breakdown):
   - buddyGreeting: 1 short, lively greeting (1 sentence).
   - coreIntent: Brief point-format explanation (1-2 bullet points or short sentences) of what the question is really asking.
   - prerequisites: 3-4 short bullet phrases (laws, formulas, concepts).
   - intuitiveAnalogy: 1-2 punchy sentences capturing the core intuition.
   - thinkingRoadmap: 3-4 short numbered steps (e.g., "1. Identify...", "2. Check...").

2. SECOND STAGE (Stage 2: Gemini Solution):
   - directAnswer: 1 crisp takeaway sentence giving the direct answer.
   - stepByStep: 2 to 3 concise steps maximum. Each step has a short explanation (1-2 bullet sentences), optional formula/code, and a 1-sentence tip.
   - keyTakeaway: 1 punchy golden rule.
   - commonPitfalls: 2 short bullet points of common mistakes.
   - memoryTrick: 1 catchy, brief mnemonic or memory hook.

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
        temperature: 0.7,
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
