const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');

async function groundedExplanation(skill, evidence) {
  if (!env.geminiConfigured) return null;
  if (!evidence.length) return null;
  const model = new GoogleGenerativeAI(env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = [
    'Explain what the supplied repository evidence demonstrates about the named skill.',
    'Use only the supplied evidence. Do not infer that the author personally wrote it or claim competence beyond this scope.',
    'Return one concise sentence. Do not fabricate filenames, code, or external facts.',
    `Skill: ${skill}`,
    `Evidence: ${JSON.stringify(evidence.map(item => ({ filePath: item.filePath, snippet: item.snippet })))}`,
    'Explanation:'
  ].join('\n');
  const result = await model.generateContent(prompt);
  return result.response.text().trim().slice(0, 500);
}

module.exports = { groundedExplanation };
