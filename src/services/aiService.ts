export type GameType = 'quiz' | 'swipe' | 'flashcard' | 'linker';

export interface BaseLevelData { title: string; type: GameType; }

export interface QuizNode { id: number; question: string; options: string[]; correctAnswer: number; hint: string; }
export interface QuizData extends BaseLevelData { nodes: QuizNode[]; }

export interface SwipeNode { statement: string; isTrue: boolean; explanation: string; }
export interface SwipeData extends BaseLevelData { nodes: SwipeNode[]; }

export interface FlashcardNode { question: string; answer: string; }
export interface FlashcardData extends BaseLevelData { nodes: FlashcardNode[]; }

export interface LinkerNode { term: string; definition: string; }
export interface LinkerData extends BaseLevelData { nodes: LinkerNode[]; }

export type AnyGameData = QuizData | SwipeData | FlashcardData | LinkerData;

function getPromptForType(type: GameType, notes: string): string {
  const basePrompt = `You are an expert curriculum designer and gamification engine.
Your task is to take the user's raw study notes and generate an interactive game level.
Output STRICTLY valid JSON ONLY without any markdown formatting blocks (do not wrap in \`\`\`json).
Here are the USER NOTES:\n${notes}\n\n`;

  if (type === 'quiz') {
    return basePrompt + `Generate exactly 5 multiple choice questions.
SCHEMA:
{
  "title": "A short title",
  "type": "quiz",
  "nodes": [
    {
      "id": 1,
      "question": "A clear multiple-choice question testing a key concept.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "hint": "A strategic hint"
    }
  ]
}`;
  }

  if (type === 'swipe') {
    return basePrompt + `Generate exactly 10 True/False statements based on the notes. Half true, half false.
SCHEMA:
{
  "title": "A short title",
  "type": "swipe",
  "nodes": [
    {
      "statement": "Mitochondria is the powerhouse of the cell.",
      "isTrue": true,
      "explanation": "Because it generates most of the cell's supply of ATP."
    }
  ]
}`;
  }

  if (type === 'flashcard') {
    return basePrompt + `Generate exactly 5 short-answer flashcard terminology questions. The 'answer' should be exactly 1 to 3 words max so the user can easily type it.
SCHEMA:
{
  "title": "A short title",
  "type": "flashcard",
  "nodes": [
    {
      "question": "The primary energy currency of the cell.",
      "answer": "ATP"
    }
  ]
}`;
  }

  if (type === 'linker') {
    return basePrompt + `Generate exactly 5 term-to-definition matching pairs from the notes.
SCHEMA:
{
  "title": "A short title",
  "type": "linker",
  "nodes": [
    {
      "term": "Chloroplast",
      "definition": "Organelle responsible for photosynthesis in plant cells."
    }
  ]
}`;
  }

  return basePrompt;
}

export async function generateGame(notes: string, type: GameType): Promise<AnyGameData> {
  const provider = localStorage.getItem('ai_provider') || 'gemini';
  const apiKey = localStorage.getItem('ai_api_key');

  if (!apiKey) {
    throw new Error('No API key found. Please save your key in settings.');
  }

  const prompt = getPromptForType(type, notes);

  if (provider === 'gemini') {
    return generateWithGemini(prompt, apiKey);
  } else {
    return generateWithOpenAI(prompt, apiKey);
  }
}

async function generateWithGemini(prompt: string, apiKey: string): Promise<AnyGameData> {
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`
  ];

  let lastError;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `API error for endpoint: ${endpoint}`);
      }

      const data = await response.json();
      const jsonText = data.candidates[0].content.parts[0].text;
      return JSON.parse(jsonText);
    } catch (e: any) {
      lastError = e;
      console.warn(`Endpoint failed, trying next fallback...`, e.message);
    }
  }

  throw new Error(`Google API threw an error for all models. Last known error: ${lastError?.message || 'Unknown'}`);
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<AnyGameData> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to generate with OpenAI API');
  }

  const data = await response.json();
  const jsonText = data.choices[0].message.content;
  return JSON.parse(jsonText);
}
