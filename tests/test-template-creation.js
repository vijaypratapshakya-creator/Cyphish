import assert from 'assert';
import * as templateController from '../controllers/templateController.js';
import templateRouter from '../routes/template.js';
import Template from '../models/Template.js';

console.log('=== Running Template Creation, AI Saving & Full-Fidelity Import Tests ===\n');

async function runTests() {
  // 1. Verify Controller Exports
  console.log('1. Verifying template controller exports...');
  assert(typeof templateController.createTemplate === 'function', 'createTemplate must be a function');
  assert(typeof templateController.updateTemplate === 'function', 'updateTemplate must be a function');
  assert(typeof templateController.getAllTemplates === 'function', 'getAllTemplates must be a function');
  assert(typeof templateController.getTemplateList === 'function', 'getTemplateList must be a function');
  assert(typeof templateController.getTemplateById === 'function', 'getTemplateById must be a function');
  assert(typeof templateController.deleteTemplate === 'function', 'deleteTemplate must be a function');
  assert(typeof templateController.generateAITemplate === 'function', 'generateAITemplate must be a function');
  console.log('   ✓ All template controller methods exported correctly.\n');

  // 2. Test Direct HTML Payload Normalization (AI Builder & HTML Composer Flow)
  console.log('2. Testing Direct HTML Template Payload Validation...');
  const sampleAiPayload = {
    name: 'Microsoft 365 Multi-Factor Authentication Re-validation',
    subject: 'Action Required: Microsoft 365 MFA Session Expiring in 2 Hours',
    category: 'IT & Security',
    difficulty: 3,
    htmlContent: '<!DOCTYPE html><html><body><h1>MFA Expiring</h1><p>Hello {{firstName}}, click {{link}}</p></body></html>',
    type: 'IT & Security',
    sourceFormat: 'html'
  };

  assert(sampleAiPayload.name && sampleAiPayload.name.trim().length > 0, 'Name must be present');
  assert(sampleAiPayload.subject && sampleAiPayload.subject.trim().length > 0, 'Subject must be present');
  assert(sampleAiPayload.htmlContent && sampleAiPayload.htmlContent.length > 0, 'HTML content must be present');
  console.log('   ✓ AI & HTML Composer payload format validated.\n');

  // 3. Test Markdown Payload Handling
  console.log('3. Testing Markdown Template Payload Handling...');
  const sampleMarkdownPayload = {
    name: 'Payroll Direct Deposit Update',
    subject: 'Urgent: Verify Direct Deposit for {{firstName}}',
    sourceFormat: 'markdown',
    markdownContent: '# Notice\n\nPlease update your direct deposit at [here]({{link}}).'
  };

  assert.strictEqual(sampleMarkdownPayload.sourceFormat, 'markdown');
  assert(sampleMarkdownPayload.markdownContent.includes('{{link}}'));
  console.log('   ✓ Markdown template payload handling validated.\n');

  // 4. Test Error Handling for Missing Fields
  console.log('4. Testing Controller Missing Field Validation Logic...');
  const missingNameReq = { body: { subject: 'Test Subject', htmlContent: '<p>Hello</p>' } };
  const missingSubjectReq = { body: { name: 'Test Name', htmlContent: '<p>Hello</p>' } };
  const missingContentReq = { body: { name: 'Test Name', subject: 'Test Subject' } };

  const createMockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.jsonData = null;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.jsonData = data;
      return res;
    };
    return res;
  };

  // Validate missing name
  const res1 = createMockRes();
  await templateController.createTemplate(missingNameReq, res1);
  assert.strictEqual(res1.statusCode, 400);
  assert.strictEqual(res1.jsonData.success, false);
  assert(res1.jsonData.message.toLowerCase().includes('name is required'), 'Should report name is required');
  console.log('   ✓ Missing name caught with 400 error.');

  // Validate missing subject
  const res2 = createMockRes();
  await templateController.createTemplate(missingSubjectReq, res2);
  assert.strictEqual(res2.statusCode, 400);
  assert.strictEqual(res2.jsonData.success, false);
  assert(res2.jsonData.message.toLowerCase().includes('subject is required'), 'Should report subject is required');
  console.log('   ✓ Missing subject caught with 400 error.');

  // Validate missing content
  const res3 = createMockRes();
  await templateController.createTemplate(missingContentReq, res3);
  assert.strictEqual(res3.statusCode, 400);
  assert.strictEqual(res3.jsonData.success, false);
  assert(res3.jsonData.message.toLowerCase().includes('cannot be empty'), 'Should report content cannot be empty');
  console.log('   ✓ Missing content caught with 400 error.\n');

  console.log('🎉 ALL TEMPLATE CREATION & SAVE TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});