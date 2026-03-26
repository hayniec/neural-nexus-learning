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

function getPromptForType(
  type: GameType, 
  notes: string, 
  hasImage: boolean, 
  count: number,
  pathway: string,
  subject: string,
  level: string
): string {
  let basePrompt = `You are an expert curriculum designer and gamification engine.
Your task is to generate an interactive learning game.
TARGET AUDIENCE LEVEL: ${level}
CURRICULUM PATHWAY: ${pathway}
SPECIFIC SUBJECT FOCUS: ${subject || "General"}

Output STRICTLY valid JSON ONLY without any markdown formatting blocks (do not wrap in \`\`\`json).\n`;

  const hasSourceMaterial = notes.trim() !== '' || hasImage;

  if (hasSourceMaterial) {
    basePrompt += `\nCRITICAL RESTRICTION: You MUST base the entire game EXCLUSIVELY on the provided notes and/or images below. Do not use outside knowledge. If the user's notes are brief, extract as much as possible but DO NOT invent facts not found in the source text/images.\n`;
  } else {
    basePrompt += `\nINSTRUCTION: You have not been provided specific notes. Please pull information from highly reliable, accurate educational sources to construct this curriculum. Ensure all facts are rigorously correct.\n`;
  }

  if (notes.trim()) {
    basePrompt += `\nHere are the text notes:\n"${notes}"\n\n`;
  }
  
  if (hasImage) {
    basePrompt += `\nPlease carefully transcribe, analyze, and extract facts from the provided image attachment to use as primary study material.\n\n`;
  }

  if (type === 'quiz') {
    return basePrompt + `Generate exactly ${count} multiple choice questions.
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
    return basePrompt + `Generate exactly ${count} True/False statements based on the material. Half true, half false.
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
    return basePrompt + `Generate exactly ${count} short-answer flashcard terminology questions. The 'answer' should be exactly 1 to 3 words max so the user can easily type it.
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
    return basePrompt + `Generate exactly ${count} term-to-definition matching pairs from the material.
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

export interface ImageDataPayload {
  base64: string;
  mimeType: string;
}

export async function generateGame(
  notes: string, 
  type: GameType, 
  images: ImageDataPayload[] = [], 
  questionCount: number = 5,
  pathway: string = 'Science',
  subject: string = '',
  level: string = 'High School'
): Promise<AnyGameData> {
  const provider = localStorage.getItem('ai_provider') || 'gemini';
  const apiKey = localStorage.getItem(`ai_key_${provider}`);

  if (!apiKey) {
    throw new Error(`No API key found for ${provider}. Please save your key in settings.`);
  }

  const hasImage = images.length > 0;
  const prompt = getPromptForType(type, notes, hasImage, questionCount, pathway, subject, level);

  if (provider === 'gemini') {
    return generateWithGemini(prompt, apiKey, images);
  } else if (provider === 'openai') {
    return generateWithOpenAI(prompt, apiKey, images);
  } else if (provider === 'claude') {
    return generateWithClaude(prompt, apiKey, images);
  } else if (provider === 'mistral') {
    return generateWithMistral(prompt, apiKey);
  } else if (provider === 'groq') {
    return generateWithGroq(prompt, apiKey);
  } else {
    return generateWithGemini(prompt, apiKey, images);
  }
}

async function generateWithGemini(prompt: string, apiKey: string, images: ImageDataPayload[]): Promise<AnyGameData> {
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`
  ];

  let lastError;
  const parts: any[] = [{ text: prompt }];
  
  for (const img of images) {
    parts.push({
      inline_data: {
        mime_type: img.mimeType,
        data: img.base64
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
            response_mime_type: 'application/json'
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

async function generateWithOpenAI(prompt: string, apiKey: string, images: ImageDataPayload[]): Promise<AnyGameData> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  
  const content: any[] = [{ type: 'text', text: prompt }];

  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`
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

async function generateWithClaude(prompt: string, apiKey: string, images: ImageDataPayload[]): Promise<AnyGameData> {
  const content: any[] = [];

  for (const img of images) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mimeType,
        data: img.base64
      }
    });
  }

  content.push({ type: 'text', text: prompt });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        { role: 'user', content }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to generate with Claude API');
  }

  const data = await response.json();
  const jsonText = data.content[0].text;
  // Claude may wrap in ```json ... ```, strip it
  const cleaned = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

async function generateWithMistral(prompt: string, apiKey: string): Promise<AnyGameData> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to generate with Mistral API');
  }

  const data = await response.json();
  const jsonText = data.choices[0].message.content;
  return JSON.parse(jsonText);
}

async function generateWithGroq(prompt: string, apiKey: string): Promise<AnyGameData> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to generate with Groq API');
  }

  const data = await response.json();
  const jsonText = data.choices[0].message.content;
  return JSON.parse(jsonText);
}
