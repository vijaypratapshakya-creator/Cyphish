import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AIIntegration from '../models/AIIntegration.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_CONFIG_PATH = path.join(__dirname, '..', 'data', 'models.json');

const PROVIDERS_REQUIRING_KEY = ['openai', 'gemini', 'claude'];
const PROVIDERS_REQUIRING_URL = ['ollama'];
const CONNECTIVITY_TIMEOUT_MS = 10000;
const GENERATION_TIMEOUT_MS = 60000;

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
      const baseRequested = requestedModel.split(':')[0];
      if (requestedModel && !modelNames.some((n) => n.includes(requestedModel) || requestedModel.includes(n) || n.includes(baseRequested))) {
        throw new Error(`Model "${model}" was not found on the Ollama server. Available models: ${modelNames.length ? modelNames.slice(0, 6).join(', ') : 'none'}. You can install it with: ollama pull ${model}`);
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

      const requestedModel = (model || '').trim().replace(/^models\//, '');
      if (requestedModel) {
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.models) ? data.models : [];
        if (list.length > 0) {
          const supported = list
            .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m) => (m.name || '').replace(/^models\//, ''));
          if (supported.length > 0 && !supported.includes(requestedModel)) {
            if (requestedModel.includes('3.1') || requestedModel.includes('3.5') || requestedModel.includes('3.7')) {
              throw new Error(`Model "${requestedModel}" does not exist in Google AI Studio API. Verified available models: ${supported.filter((s) => s.startsWith('gemini-')).slice(0, 5).join(', ')}.`);
            }
          }
        }
      }
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
 * Discover live active models directly from the provider's API.
 */
export async function discoverLiveModels({ provider, apiKey, baseUrl } = {}) {
  let targetProvider = provider;
  let targetKey = apiKey;
  let targetBaseUrl = baseUrl;

  // If parameters not provided, use active integration
  if (!targetProvider) {
    const active = await getActiveIntegrationWithKey();
    if (!active || !active.isActive) {
      throw new Error('No active AI integration configured.');
    }
    targetProvider = active.provider;
    targetKey = active.apiKey;
    targetBaseUrl = active.baseUrl;
  } else if (!targetKey && ['openai', 'gemini', 'claude'].includes(targetProvider)) {
    const active = await getActiveIntegrationWithKey();
    if (active && active.provider === targetProvider) {
      targetKey = active.apiKey;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);

  try {
    // 1. Google Gemini Live Discovery
    if (targetProvider === 'gemini') {
      const key = targetKey && String(targetKey).trim();
      if (!key) throw new Error('API key is required to discover Gemini models.');
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || `Failed to fetch Gemini models (${res.status})`);
      }

      const data = await res.json();
      const rawList = Array.isArray(data?.models) ? data.models : [];

      // Filter for generateContent models and format
      const discovered = rawList
        .filter((m) => {
          const methods = m.supportedGenerationMethods || [];
          return methods.includes('generateContent');
        })
        .map((m) => {
          const cleanId = (m.name || '').replace(/^models\//, '');
          const isFlash = cleanId.includes('flash');
          const isPro = cleanId.includes('pro');
          const isExp = cleanId.includes('exp');
          let labelBadge = '⚡ [Live from Your Google Key]';
          if (isFlash) labelBadge = '⚡ [Fast / Generous Free Tier]';
          else if (isPro) labelBadge = '⚡ [Advanced Reasoning]';
          else if (isExp) labelBadge = '⚡ [Experimental]';

          return {
            id: cleanId,
            name: `${m.displayName || cleanId} ${labelBadge}`,
            tier: 'live_discovered',
            description: m.description || '',
            inputTokenLimit: m.inputTokenLimit,
            outputTokenLimit: m.outputTokenLimit,
          };
        });

      // Priority sort: standard 2.0/1.5 flash models first
      discovered.sort((a, b) => {
        if (a.id === 'gemini-2.0-flash') return -1;
        if (b.id === 'gemini-2.0-flash') return 1;
        if (a.id === 'gemini-1.5-flash') return -1;
        if (b.id === 'gemini-1.5-flash') return 1;
        if (a.id.includes('flash') && !b.id.includes('flash')) return -1;
        if (!a.id.includes('flash') && b.id.includes('flash')) return 1;
        return a.id.localeCompare(b.id);
      });

      return {
        provider: 'gemini',
        live: true,
        count: discovered.length,
        defaultModelId: discovered.find((m) => m.id === 'gemini-2.0-flash')?.id || discovered[0]?.id || 'gemini-2.0-flash',
        models: discovered,
      };
    }

    // 2. Ollama Live Discovery
    if (targetProvider === 'ollama') {
      const url = (targetBaseUrl && String(targetBaseUrl).trim()) ? String(targetBaseUrl).trim().replace(/\/$/, '') : 'http://localhost:11434';
      const res = await fetch(`${url}/api/tags`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Ollama unreachable at ${url} (${res.status})`);
      const data = await res.json();
      const rawList = Array.isArray(data?.models) ? data.models : [];
      const discovered = rawList.map((m) => {
        const id = m.name || m.model;
        const sizeGb = m.size ? (m.size / (1024 * 1024 * 1024)).toFixed(1) + ' GB' : '';
        return {
          id,
          name: `${id} ⚡ [Local Installed${sizeGb ? ` · ${sizeGb}` : ''}]`,
          tier: 'free_local',
          details: m.details,
        };
      });

      return {
        provider: 'ollama',
        live: true,
        count: discovered.length,
        defaultModelId: discovered[0]?.id || 'llama3.2',
        models: discovered,
      };
    }

    // 3. OpenAI Live Discovery
    if (targetProvider === 'openai') {
      const key = targetKey && String(targetKey).trim();
      if (!key) throw new Error('API key is required to discover OpenAI models.');
      const res = await fetch('https://api.openai.com/v1/models', {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenAI models fetch failed (${res.status})`);
      }
      const data = await res.json();
      const rawList = Array.isArray(data?.data) ? data.data : [];
      const chatPrefixes = ['gpt-4', 'gpt-3.5', 'o1', 'o3', 'chatgpt'];
      const filtered = rawList.filter((m) => chatPrefixes.some((p) => (m.id || '').startsWith(p)));
      
      const discovered = filtered.map((m) => ({
        id: m.id,
        name: `${m.id} [Live OpenAI Account Model]`,
        tier: 'live_discovered',
        created: m.created,
      }));

      discovered.sort((a, b) => {
        if (a.id === 'gpt-4o-mini') return -1;
        if (b.id === 'gpt-4o-mini') return 1;
        if (a.id === 'gpt-4o') return -1;
        if (b.id === 'gpt-4o') return 1;
        return a.id.localeCompare(b.id);
      });

      return {
        provider: 'openai',
        live: true,
        count: discovered.length,
        defaultModelId: 'gpt-4o-mini',
        models: discovered,
      };
    }

    // 4. Claude Live Discovery
    if (targetProvider === 'claude') {
      const key = targetKey && String(targetKey).trim();
      if (!key) throw new Error('API key is required to discover Claude models.');
      const res = await fetch('https://api.anthropic.com/v1/models', {
        signal: controller.signal,
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data?.data) ? data.data : [];
        if (rawList.length > 0) {
          const discovered = rawList.map((m) => ({
            id: m.id,
            name: `${m.display_name || m.id} [Live Anthropic Account Model]`,
            tier: 'live_discovered',
          }));
          return {
            provider: 'claude',
            live: true,
            count: discovered.length,
            defaultModelId: discovered[0]?.id || 'claude-3-7-sonnet-20250219',
            models: discovered,
          };
        }
      }

      // If Anthropic list endpoint is restricted on the key, return verified models
      const cfg = await getModelsConfig();
      return {
        provider: 'claude',
        live: false,
        count: cfg.providers?.claude?.models?.length || 0,
        defaultModelId: cfg.providers?.claude?.defaultModelId || 'claude-3-7-sonnet-20250219',
        models: cfg.providers?.claude?.models || [],
      };
    }

    throw new Error(`Unsupported provider: ${targetProvider}`);

  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Discovery timed out. Check connection to provider.');
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
        version: 4,
        updated: '2026-09-04',
        providers: {
          gemini: {
            defaultModelId: 'gemini-2.0-flash',
            models: [
              { id: 'gemini-2.0-flash', name: '3.7 Flash / Gemini 2.0 Flash ⚡ [All-Around Help / Free Tier]', tier: 'free_tier' },
              { id: 'gemini-2.0-flash-lite', name: '3.5 Flash-Lite / Gemini 2.0 Flash-Lite ⚡ [Fastest Answers / Free Tier]', tier: 'free_tier' },
              { id: 'gemini-1.5-pro', name: '3.1 Pro / Gemini 1.5 Pro ⚡ [Advanced Reasoning / Free Tier]', tier: 'free_tier' },
              { id: 'gemini-2.0-pro-exp-02-05', name: 'Extended Thinking / Gemini 2.0 Pro ⚡ [Complex Problem Solving]', tier: 'reasoning_free' },
              { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash ⚡ [Highest Availability & Reliability / Free Tier]', tier: 'free_tier' },
              { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash-8B ⚡ [High Throughput / Free Tier]', tier: 'free_tier' },
            ],
          },
          claude: {
            defaultModelId: 'claude-3-7-sonnet-20250219',
            models: [
              { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet [Verified / Hybrid Reasoning Benchmark]', tier: 'standard' },
              { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet [Verified / Industry Standard Benchmark]', tier: 'standard' },
              { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku ⚡ [Verified / Fast & Cost Effective]', tier: 'budget' },
              { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus [Verified / Deep Analysis & Research]', tier: 'standard' },
            ],
          },
          openai: {
            defaultModelId: 'gpt-4o-mini',
            models: [
              { id: 'gpt-4o-mini', name: 'GPT-4o mini ⚡ [Verified / Fast / Free Trial Grants]', tier: 'budget' },
              { id: 'gpt-4o', name: 'GPT-4o [Verified / Flagship Multimodal Intelligence]', tier: 'standard' },
              { id: 'o3-mini', name: 'o3-mini [Verified / Latest Advanced STEM / Fast Reasoning]', tier: 'reasoning' },
              { id: 'o1', name: 'o1 [Verified / Complex Logic & Social Engineering]', tier: 'reasoning' },
              { id: 'o1-mini', name: 'o1-mini [Verified / Fast Reasoning]', tier: 'reasoning' },
              { id: 'gpt-4-turbo', name: 'GPT-4 Turbo [Verified / Reliable Production Workhorse]', tier: 'legacy' },
            ],
          },
          ollama: {
            defaultModelId: 'llama3.2',
            models: [
              { id: 'llama3.2', name: 'Llama 3.2 (3B) ⚡ [100% Free / Local / Fast Default]', tier: 'free_local' },
              { id: 'llama3.2:1b', name: 'Llama 3.2 (1B Lightweight) ⚡ [100% Free / Local / Instant]', tier: 'free_local' },
              { id: 'llama3.3:70b', name: 'Llama 3.3 (70B Flagship) ⚡ [100% Free / Local / Enterprise Quality]', tier: 'free_local' },
              { id: 'llama3.1:8b', name: 'Llama 3.1 (8B Standard) ⚡ [100% Free / Local / Balanced]', tier: 'free_local' },
              { id: 'deepseek-r1:8b', name: 'DeepSeek R1 (8B Reasoning) ⚡ [100% Free / Local / Deep Chain-of-Thought]', tier: 'free_local' },
              { id: 'deepseek-r1:14b', name: 'DeepSeek R1 (14B Reasoning) ⚡ [100% Free / Local / High Accuracy]', tier: 'free_local' },
              { id: 'deepseek-r1:32b', name: 'DeepSeek R1 (32B Advanced) ⚡ [100% Free / Local / Elite Reasoning]', tier: 'free_local' },
              { id: 'qwen2.5:7b', name: 'Qwen 2.5 (7B Structured JSON) ⚡ [100% Free / Local / High JSON Quality]', tier: 'free_local' },
              { id: 'qwen2.5:14b', name: 'Qwen 2.5 (14B Structured JSON) ⚡ [100% Free / Local / Complex Structure]', tier: 'free_local' },
              { id: 'mistral:7b', name: 'Mistral 7B ⚡ [100% Free / Local / Reliable]', tier: 'free_local' },
              { id: 'gemma2:9b', name: 'Google Gemma 2 (9B) ⚡ [100% Free / Local / High Quality Text]', tier: 'free_local' },
              { id: 'phi3.5:3.8b', name: 'Microsoft Phi 3.5 ⚡ [100% Free / Local / Compact]', tier: 'free_local' },
            ],
          },
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
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

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
 * Smart candidate resolver for Gemini models
 */
function resolveGeminiModelCandidates(inputModel) {
  const raw = String(inputModel || 'gemini-2.0-flash').trim().replace(/^models\//, '');
  const lower = raw.toLowerCase();
  const candidates = [];

  if (lower.includes('3.7') || lower.includes('2.5') || lower.includes('all-around')) {
    candidates.push(raw, 'gemini-2.0-flash', 'gemini-1.5-flash');
  } else if (lower.includes('3.5') || lower.includes('flash-lite') || lower.includes('fastest')) {
    candidates.push(raw, 'gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-1.5-flash');
  } else if (lower.includes('3.1') || lower.includes('thinking') || lower.includes('reasoning') || lower.includes('exp')) {
    candidates.push(raw, 'gemini-2.0-pro-exp-02-05', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash');
  } else {
    candidates.push(raw, 'gemini-2.0-flash', 'gemini-1.5-flash');
  }

  return [...new Set(candidates.filter(Boolean))];
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
  selectedModel = '',
}) {
  const activeIntegration = await getActiveIntegrationWithKey();
  if (!activeIntegration || !activeIntegration.isActive) {
    throw new Error('No active AI provider configured. Please configure OpenAI, Gemini, Claude, or Ollama in Account Settings.');
  }

  const { provider, apiKey, baseUrl } = activeIntegration;
  const model = (selectedModel && String(selectedModel).trim()) ? String(selectedModel).trim() : activeIntegration.model;
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
    let usedModel = model;
    if (provider === 'gemini') {
      const key = apiKey && String(apiKey).trim();
      const candidateModels = resolveGeminiModelCandidates(model);

      let lastError = null;
      let generationSuccess = false;

      for (let cIdx = 0; cIdx < candidateModels.length; cIdx++) {
        const currentModel = candidateModels[cIdx];
        const isFallback = cIdx > 0;
        const maxRetries = isFallback ? 1 : 2;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (attempt > 0) {
            // Exponential backoff
            const delay = 1200 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(key)}`, {
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

          if (res.ok) {
            const data = await res.json();
            rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawResponseText) {
              usedModel = currentModel;
              generationSuccess = true;
              break;
            }
          }

          const errBody = await res.json().catch(() => ({}));
          const errMsg = errBody.error?.message || res.statusText;

          // If auth issue, throw immediately
          if (res.status === 400 || res.status === 401 || res.status === 403) {
            const isKeyError = errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('denied');
            if (isKeyError) {
              throw new Error(`Gemini authentication / API Key error: ${errMsg}`);
            }
          }

          if (res.status === 404) {
            lastError = new Error(`Gemini model "${currentModel}" not found (404).`);
            break; // Move to next fallback candidate
          }

          if (res.status === 503 || res.status === 429) {
            lastError = new Error(`Gemini high demand (${res.status}): ${errMsg}`);
            continue; // retry with backoff
          }

          lastError = new Error(`Gemini error (${res.status}): ${errMsg}`);
          break;
        }

        if (generationSuccess) break;
      }

      if (!generationSuccess) {
        throw lastError || new Error('Failed to generate template via Gemini.');
      }
    }

    // 4. Anthropic Claude Provider
    else if (provider === 'claude') {
      const key = apiKey && String(apiKey).trim();
      const targetModel = model || 'claude-3-5-sonnet-20241022';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: targetModel,
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
      aiModel: provider === 'gemini' ? (usedModel || model) : model,
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
