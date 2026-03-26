export interface QuizNode {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  hint: string;
}

export interface LevelData {
  title: string;
  nodes: QuizNode[];
}

const SYSTEM_PROMPT = `You are an expert curriculum designer and gamification engine.
Your task is to take the user's raw study notes and generate an interactive multiple-choice quiz level.
Output STRICTLY valid JSON ONLY in the following format. Ensure that there are no markdown formatting blocks around the JSON (e.g. do not output \`\`\`json...):
{
  "title": "A short, engaging title based on the notes (e.g. Cellular Respiration - Level 1)",
  "nodes": [
    {
      "id": 1,
      "question": "A clear multiple-choice question testing a key concept.",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "hint": "A strategic hint that helps the student think without giving the direct answer."
    }
  ]
}
Generate exactly 4 to 5 questions based on the provided notes. Make sure the correct answer index is accurate (0 for the first option, 1 for the second, etc).`;

export async function generateQuiz(notes: string): Promise<LevelData> {
  const provider = localStorage.getItem('ai_provider') || 'gemini';
  const apiKey = localStorage.getItem('ai_api_key');

  if (!apiKey) {
    throw new Error('No API key found. Please save your key in settings.');
  }

  if (provider === 'gemini') {
    return generateWithGemini(notes, apiKey);
  } else {
    return generateWithOpenAI(notes, apiKey);
  }
}

async function generateWithGemini(notes: string, apiKey: string): Promise<LevelData> {
  // We try a list of fallbacks covering both v1 and v1beta API versions, starting with the newest 2.0 models
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
          contents: [{
            parts: [{ text: `${SYSTEM_PROMPT}\n\nUSER NOTES:\n${notes}` }]
          }],
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

async function generateWithOpenAI(notes: string, apiKey: string): Promise<LevelData> {
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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `USER NOTES:\n${notes}` }
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
