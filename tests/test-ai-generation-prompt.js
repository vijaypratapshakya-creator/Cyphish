import assert from 'assert';

console.log('--- Running AI Threat Generator & JSON Parsing Tests ---');

// Test 1: Test JSON Extraction from LLM text with markdown code fences
function extractAndParseJSON(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

const mockLlmOutputWithMarkdown = `
Here is the generated scenario for your drill:
\`\`\`json
{
  "name": "Microsoft 365 Password Expiration Alert",
  "subject": "Action Required: Password Expires in 2 Hours",
  "category": "IT & Security",
  "difficulty": 3,
  "senderNameSuggestion": "Microsoft Account Security",
  "htmlContent": "<!DOCTYPE html><html><body><p>Hello {{firstName}},</p><p>Please verify at <a href=\\"{{link}}\\">Verify</a></p></body></html>",
  "educationalRedFlags": [
    { "title": "1. Artificial Urgency", "description": "2-hour deadline" },
    { "title": "2. Unexpected Link", "description": "External domain" }
  ]
}
\`\`\`
Hope this helps!
`;

const parsed = extractAndParseJSON(mockLlmOutputWithMarkdown);
assert.strictEqual(parsed.name, 'Microsoft 365 Password Expiration Alert');
assert.strictEqual(parsed.difficulty, 3);
assert.ok(parsed.htmlContent.includes('{{link}}'));
assert.strictEqual(parsed.educationalRedFlags.length, 2);
console.log('✅ Test 1: Markdown-wrapped LLM JSON Parsing Passed');

// Test 2: Fallback token injection
function ensureActionLink(html) {
  if (!html.includes('{{link}}') && !html.includes('{{ link }}')) {
    return html + `<p><a href="{{link}}">Verify Account</a></p>`;
  }
  return html;
}

const htmlWithoutLink = '<p>Hello user, your account requires attention.</p>';
const fixedHtml = ensureActionLink(htmlWithoutLink);
assert.ok(fixedHtml.includes('{{link}}'));
console.log('✅ Test 2: Fallback {{link}} Token Injection Passed');

// Test 3: Placeholder Token Rendering
function renderTemplate(html, data = {}) {
  return html.replace(/{{\s*([a-zA-Z0-9_.]+)\s*}}/g, (match, key) => {
    return data[key] || match;
  });
}

const sampleEmail = '<p>Dear {{firstName}}, your {{company}} account is pending review at <a href="{{link}}">Link</a></p>';
const rendered = renderTemplate(sampleEmail, { firstName: 'Sarah', company: 'Global Bank', link: 'https://drill.internal' });
assert.ok(rendered.includes('Dear Sarah'));
assert.ok(rendered.includes('Global Bank'));
assert.ok(rendered.includes('https://drill.internal'));
console.log('✅ Test 3: Placeholder Replacement in AI Templates Passed');

console.log('\nAll AI Threat Generator Unit Tests Passed Successfully!\n');
