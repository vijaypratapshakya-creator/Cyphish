import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AIIntegration from '../models/AIIntegration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_CONFIG_PATH = path.join(__dirname, '..', 'data', 'models.json');

const PROVIDERS_REQUIRING_KEY = ['openai', 'gemini', 'claude'];
const PROVIDERS_REQUIRING_URL = ['ollama'];
const CONNECTIVITY_TIMEOUT_MS = 10000;
const GENERATION_TIMEOUT_MS = 45000;

/**
 * Test connectivity to the configured AI provider before saving.
 * Throws an Error with a user-friendly message if the check fails.
 */
export async function testConnection({ provider, model, apiKey, baseUrl }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);

  try {
    if (provider === 'ollama') {
      const url = (baseUrl && String(baseUrl).trim()) ? String(baseUrl).trim().replace(/\/$/, '') : 'http://localhost:11434';
      const res = await fetch(`${url}/api/tags`, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Ollama is not reachable at ${url}. Is the server running? (${res.status})`);
      }
      const data = await res.json().catch(() => ({}));
      const models = Array.isArray(data?.models) ? data.models : [];
      const modelNames = models.map((m) => (m.name || m.model || '').toLowerCase());
      const requestedModel = (model || '').trim().toLowerCase();
      if (requestedModel && !modelNames.some((n) => n.includes(requestedModel) || requestedModel.includes(n))) {
        throw new Error(`Model "${model}" was not found on the Ollama server. Available: ${modelNames.length ? modelNames.slice(0, 5).join(', ') : 'none'}.`);
      }
      return;
    }

    if (provider === 'openai') {
      const key = apiKey && String(apiKey).trim();
      if (!key) throw new Error('API key is required to verify OpenAI.');
      const res = await fetch('https://api.openai.com/v1/models', {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status === 401) throw new Error('Invalid OpenAI API key.');
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error?.message || res.statusText;
        throw new Error(`OpenAI request failed: ${msg || res.status}`);
      }
      return;
    }

    if (provider === 'gemini') {
      const key = apiKey && String(apiKey).trim();
      if (!key) throw new Error('API key is required to verify Gemini.');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {
        signal: controller.signal,
      });
      if (res.status === 400 || res.status === 403) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error?.message || 'Invalid API key or access denied.';
        throw new Error(msg);
      }
      if (!res.ok) throw new Error(`Gemini request failed: ${res.status} ${res.statusText}`);
      return;
    }

    if (provider === 'claude') {
      const key = apiKey && String(apiKey).trim();
      if (!key) throw new Error('API key is required to verify Claude.');
      const res = await fetch('https://api.anthropic.com/v1/models', {
        signal: controller.signal,
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      });
      if (res.status === 401) throw new Error('Invalid Claude API key.');
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error?.message || res.statusText;
        throw new Error(`Claude request failed: ${msg || res.status}`);
      }
      return;
    }

  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. Check the URL and that the service is running.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Load AI models config from data/models.json.
 */
export async function getModelsConfig() {
  try {
    const raw = await fs.readFile(MODELS_CONFIG_PATH, 'utf8');
    const config = JSON.parse(raw);
    return config;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        version: 1,
        updated: null,
        providers: {
          ollama: { defaultModelId: 'llama3.2', models: [{ id: 'llama3.2', name: 'Llama 3.2 (local)' }] },
          openai: { defaultModelId: 'gpt-4o-mini', models: [{ id: 'gpt-4o-mini', name: 'GPT-4o mini' }] },
          gemini: { defaultModelId: 'gemini-1.5-flash', models: [{ id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }] },
          claude: { defaultModelId: 'claude-3-5-sonnet-20241022', models: [{ id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' }] },
        },
      };
    }
    throw err;
  }
}

export async function getActiveIntegration() {
  const doc = await AIIntegration.findOne({ isActive: true }).lean();
  if (!doc) return null;
  const { apiKey, ...rest } = doc;
  return {
    ...rest,
    hasApiKey: Boolean(apiKey && apiKey.length > 0),
    hasBaseUrl: Boolean(doc.baseUrl && doc.baseUrl.length > 0),
  };
}

export async function getActiveIntegrationWithKey() {
  return AIIntegration.findOne({ isActive: true });
}

export function validateConfig({ provider, model, apiKey, baseUrl }) {
  if (!provider || !model) {
    throw new Error('Provider and model are required');
  }
  if (!['ollama', 'openai', 'gemini', 'claude'].includes(provider)) {
    throw new Error('Invalid provider');
  }
  if (PROVIDERS_REQUIRING_KEY.includes(provider) && (!apiKey || !String(apiKey).trim())) {
    throw new Error('API key is required for this provider');
  }
}

export async function upsertIntegration({ provider, model, apiKey, baseUrl }) {
  const url = (provider === 'ollama' && (!baseUrl || !String(baseUrl).trim()))
    ? 'http://localhost:11434'
    : (baseUrl && String(baseUrl).trim()) || '';
  validateConfig({ provider, model, apiKey, baseUrl: url || baseUrl });

  let keyForTest = apiKey != null ? String(apiKey).trim() : '';
  if (['openai', 'gemini', 'claude'].includes(provider) && !keyForTest) {
    const existing = await AIIntegration.findOne({ isActive: true });
    if (existing && existing.apiKey) keyForTest = existing.apiKey;
  }

  await testConnection({
    provider,
    model: (model || '').trim(),
    apiKey: keyForTest,
    baseUrl: url || baseUrl,
  });

  await AIIntegration.updateMany({}, { $set: { isActive: false } });

  const payload = {
    provider,
    model: (model || '').trim(),
    isActive: true,
  };
  if (apiKey !== undefined && apiKey !== null) payload.apiKey = String(apiKey).trim();
  if (provider === 'ollama') payload.baseUrl = url || (baseUrl && String(baseUrl).trim()) || 'http://localhost:11434';
  else if (baseUrl !== undefined && baseUrl !== null) payload.baseUrl = String(baseUrl).trim();

  let doc = await AIIntegration.findOne({ isActive: true });
  if (doc) {
    doc.provider = payload.provider;
    doc.model = payload.model;
    doc.apiKey = payload.apiKey ?? doc.apiKey;
    doc.baseUrl = payload.baseUrl ?? doc.baseUrl;
    doc.isActive = true;
    await doc.save();
  } else {
    doc = new AIIntegration(payload);
    await doc.save();
  }

  const { apiKey: _key, ...safe } = doc.toObject();
  return { ...safe, hasApiKey: Boolean(doc.apiKey && doc.apiKey.length > 0) };
}

export async function disconnectIntegration() {
  const doc = await AIIntegration.findOne({ isActive: true });
  if (!doc) return null;
  doc.isActive = false;
  doc.apiKey = '';
  doc.baseUrl = '';
  await doc.save();
  return doc;
}

/**
 * Robust JSON extraction from LLM completion text.
 */
function extractAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or invalid response received from AI provider.');
  }

  let cleaned = rawText.trim();
  // Remove markdown code fences if present (```json ... ``` or ``` ...)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Find first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse AI output as JSON: ${err.message}. Raw: ${rawText.slice(0, 200)}...`);
  }
}

/**
 * System Prompt for Cybersecurity Phishing Simulation Generation
 */
function buildCybersecuritySystemPrompt() {
  return `You are CyPhish AI, an expert cybersecurity simulation and social engineering threat engineer.
Your mission is to generate realistic, full-fidelity simulated phishing email templates for internal employee security awareness drills.

CRITICAL GUIDELINES:
1. The email must look highly authentic, visually clean, and realistic for modern email clients (responsive HTML table layout with inline CSS styles).
2. You MUST include the simulated action link token: <a href="{{link}}">Call to Action Button or Link</a>
3. You should include standard personalization tokens where natural: {{firstName}}, {{lastName}}, {{company}}, {{department}}.
4. You may optionally include an in-email reporting link: <a href="{{reportLink}}">Report Suspicious Email</a>
5. Ensure the email has realistic sender branding, security indicators, clean typography (e.g., Segoe UI, Arial, sans-serif), and plausible pretext.
6. Provide an educational breakdown of 3 to 4 specific "Red Flags" that vigilant employees should notice.

OUTPUT FORMAT:
You MUST respond with a single, strictly valid JSON object adhering to this schema:
{
  "name": "Concise Scenario Name (e.g., Microsoft 365 MFA Session Expiry)",
  "subject": "Compelling Subject Line with urgency or corporate context",
  "category": "One of: IT & Security | Finance & Payroll | HR & Benefits | Executive / Spear | Urgent Notice",
  "difficulty": 1 to 5 (Integer representing scenario subtlety: 1=Easy, 3=Medium, 5=Hard Spear Phish),
  "senderNameSuggestion": "Suggested display sender name (e.g. IT Security Services, HR Department)",
  "htmlContent": "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body style='margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f4f5f7;'>...full HTML layout...</body></html>",
  "educationalRedFlags": [
    { "title": "1. Artificial Urgency", "description": "Demands action within 2 hours to avoid account suspension." },
    { "title": "2. Unexpected Credential Verification", "description": "Legitimate IT will not ask to verify passwords via external email links." },
    { "title": "3. Link Destination Preview", "description": "The destination URL does not match the official company domain." }
  ]
}`;
}

/**
 * Generate a complete threat scenario using the active configured AI integration.
 */
export async function generateThreatScenario({
  targetAudience = 'General Employees',
  category = 'IT & Security',
  difficulty = 3,
  scenarioPrompt = '',
  companyName = 'Acme Corporation',
  tone = 'Authoritative & Urgent',
}) {
  const activeIntegration = await getActiveIntegrationWithKey();
  if (!activeIntegration || !activeIntegration.isActive) {
    throw new Error('No active AI provider configured. Please configure OpenAI, Gemini, Claude, or Ollama in Account Settings.');
  }

  const { provider, model, apiKey, baseUrl } = activeIntegration;
  const systemPrompt = buildCybersecuritySystemPrompt();

  const userPrompt = `Generate a realistic security awareness phishing simulation scenario with the following parameters:
- Target Audience: ${targetAudience}
- Scenario Category: ${category}
- Sophistication Difficulty: Level ${difficulty} of 5
- Tone: ${tone}
- Organization Name Context: ${companyName}
- Specific Scenario Details / Pretext: ${scenarioPrompt || 'Create a realistic, highly engaging simulation appropriate for the category and audience.'}

Remember to return ONLY the raw JSON object matching the required schema. Ensure {{link}} is used for the clickable payload button.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

  try {
    let rawResponseText = '';

    // 1. Ollama Provider
    if (provider === 'ollama') {
      const url = (baseUrl && String(baseUrl).trim()) ? String(baseUrl).trim().replace(/\/$/, '') : 'http://localhost:11434';
      const res = await fetch(`${url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: model || 'llama3.2',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          format: 'json',
          stream: false,
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama generation failed with status ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      rawResponseText = data.message?.content || data.response || '';
    }

    // 2. OpenAI Provider
    else if (provider === 'openai') {
      const key = apiKey && String(apiKey).trim();
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`OpenAI error (${res.status}): ${errBody.error?.message || res.statusText}`);
      }
      const data = await res.json();
      rawResponseText = data.choices?.[0]?.message?.content || '';
    }

    // 3. Google Gemini Provider
    else if (provider === 'gemini') {
      const key = apiKey && String(apiKey).trim();
      const targetModel = model || 'gemini-1.5-flash';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\nTask:\n${userPrompt}` },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`Gemini error (${res.status}): ${errBody.error?.message || res.statusText}`);
      }
      const data = await res.json();
      rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // 4. Anthropic Claude Provider
    else if (provider === 'claude') {
      const key = apiKey && String(apiKey).trim();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`Claude error (${res.status}): ${errBody.error?.message || res.statusText}`);
      }
      const data = await res.json();
      rawResponseText = data.content?.[0]?.text || '';
    }

    const parsed = extractAndParseJSON(rawResponseText);

    // Sanitize & guarantee essential fields
    let htmlContent = parsed.htmlContent || '<p>Click <a href="{{link}}">here</a> to verify.</p>';
    if (!htmlContent.includes('{{link}}') && !htmlContent.includes('{{ link }}')) {
      // Append a fallback link if the model omitted it
      htmlContent += `<p style="margin-top:20px;text-align:center;"><a href="{{link}}" style="background-color:#0078d4;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">Verify Account</a></p>`;
    }

    return {
      name: parsed.name || `${category} Awareness Drill`,
      subject: parsed.subject || `Important Notification: ${category}`,
      category: parsed.category || category,
      difficulty: Number(parsed.difficulty) || Number(difficulty) || 3,
      senderNameSuggestion: parsed.senderNameSuggestion || 'IT Security Desk',
      htmlContent,
      educationalRedFlags: Array.isArray(parsed.educationalRedFlags) ? parsed.educationalRedFlags : [
        { title: '1. Urgency Trigger', description: 'Pressures the employee to act quickly.' },
        { title: '2. Suspicious Link Target', description: 'Destination link is not verified.' },
      ],
      aiProvider: provider,
      aiModel: model,
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`AI generation timed out after ${GENERATION_TIMEOUT_MS / 1000} seconds. Please check server responsiveness.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
