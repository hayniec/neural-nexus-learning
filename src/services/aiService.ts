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

function getPromptForType(type: GameType, notes: string, hasImage: boolean): string {
  let basePrompt = `You are an expert curriculum designer and gamification engine.
Your task is to take the user's provided study notes (and/or uploaded images from handwritten notes, textbooks, or diagrams) and generate an interactive game level.
Output STRICTLY valid JSON ONLY without any markdown formatting blocks (do not wrap in \`\`\`json).\n`;

  if (notes.trim()) {
    basePrompt += `\nHere are the text notes:\n${notes}\n\n`;
  }
  if (hasImage) {
    basePrompt += `\nPlease carefully transcribe, analyze, and extract facts from the provided image attachment to use as primary study material.\n\n`;
  }

  if (type === 'quiz') {
    return basePrompt + `Generate exactly 5 multiple choice questions.
SCHEMA:
{
  "title": "A short title based on material",
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
    return basePrompt + `Generate exactly 10 True/False statements based on the material. Half true, half false.
SCHEMA:
{
  "title": "A short title based on material",
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
  "title": "A short title based on material",
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
    return basePrompt + `Generate exactly 5 term-to-definition matching pairs from the material.
SCHEMA:
{
  "title": "A short title based on material",
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

export async function generateGame(notes: string, type: GameType, imageBase64?: string, imageMimeType?: string): Promise<AnyGameData> {
  const provider = localStorage.getItem('ai_provider') || 'gemini';
  const apiKey = localStorage.getItem('ai_api_key');

  if (!apiKey) {
    throw new Error('No API key found. Please save your key in settings.');
  }

  const hasImage = !!imageBase64;
  const prompt = getPromptForType(type, notes, hasImage);

  if (provider === 'gemini') {
    return generateWithGemini(prompt, apiKey, imageBase64, imageMimeType);
  } else {
    return generateWithOpenAI(prompt, apiKey, imageBase64, imageMimeType);
  }
}

async function generateWithGemini(prompt: string, apiKey: string, imageBase64?: string, imageMimeType?: string): Promise<AnyGameData> {
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`
  ];

  let lastError;
  const parts: any[] = [{ text: prompt }];
  if (imageBase64 && imageMimeType) {
    parts.push({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64
      }
    });
  }

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
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

async function generateWithOpenAI(prompt: string, apiKey: string, imageBase64?: string, imageMimeType?: string): Promise<AnyGameData> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  
  const content: any[] = [{ type: 'text', text: prompt }];

  if (imageBase64 && imageMimeType) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${imageMimeType};base64,${imageBase64}`
      }
    });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content }
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
