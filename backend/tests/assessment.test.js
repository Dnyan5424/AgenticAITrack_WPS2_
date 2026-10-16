const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'unit-test-secret-that-is-long-enough-123';
process.env.GITHUB_CLIENT_ID = 'unit-test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'unit-test-client-secret';
process.env.GITHUB_REDIRECT_URI = 'http://localhost:5000/api/github/callback';
const { classify, NOT_DEMONSTRATED, affectedSkills, evidenceCandidates } = require('../src/services/skillAssessmentService');
const { isPublicRepository, assertPublicRepository } = require('../src/services/githubService');
const { createAuthorization } = require('../src/services/oauthService');
const { parseJobDescription } = require('../src/services/jobParserService');

test('GitHub OAuth requests profile and email access without repository scopes', () => {
  const authorization = new URL(createAuthorization('state'));
  assert.equal(authorization.searchParams.get('scope'), 'read:user user:email');
});

test('GitHub repository access permits public repositories only', () => {
  assert.equal(isPublicRepository({ private: false }), true);
  assert.equal(isPublicRepository({ private: true }), false);
  assert.equal(isPublicRepository({}), false);
  assert.doesNotThrow(() => assertPublicRepository({ private: false }));
  assert.throws(() => assertPublicRepository({ private: true }), { status: 403 });
});

test('an empty evidence set uses the exact out-of-scope assessment status', () => {
  assert.deepEqual(classify([]), { status: NOT_DEMONSTRATED, confidence: 0.2 });
  assert.equal(NOT_DEMONSTRATED, 'not_demonstrated_in_this_scope');
});

test('job description parsing separates preferred from required skills', () => {
  const parsed = parseJobDescription([
    'Software Engineering Intern',
    'Required: React and Node.js experience.',
    'Nice to have: Docker.'
  ].join('\n'));
  assert.ok(parsed.requiredSkills.includes('React'));
  assert.ok(parsed.requiredSkills.includes('Node.js'));
  assert.ok(parsed.preferredSkills.includes('Docker'));
  assert.ok(!parsed.requiredSkills.includes('Docker'));
});

test('assessment status reflects the amount and kind of evidence', () => {
  const item = { evidenceType: 'source', filePath: 'src/server.js' };
  assert.equal(classify([item]).status, 'partial');
  assert.equal(classify([item, { ...item, evidenceType: 'test', filePath: 'test/server.test.js' }]).status, 'demonstrated');
});

test('changed-file impact does not pull in skills found only in unrelated repository files', () => {
  const impacted = affectedSkills(
    ['src/auth.js'],
    [{ path: 'src/auth.js', content: 'const token = createToken();' }]
  );
  assert.ok(impacted.includes('JavaScript'));
  assert.ok(!impacted.includes('React'));
});

test('Dockerfile changes are classified as Docker-related without matching unrelated skills', () => {
  const impacted = affectedSkills(['Dockerfile'], [{ path: 'Dockerfile', content: 'FROM node:20-alpine' }]);
  assert.ok(impacted.includes('Docker'));
  assert.ok(!impacted.includes('Node.js'));
});

test('Docker evidence points to the analyzed file and actual commit', () => {
  const evidence = evidenceCandidates('Docker', [{
    path: 'Dockerfile',
    content: 'FROM node:20-alpine',
    url: 'https://github.com/example/project/blob/abc123/Dockerfile'
  }], 'abc123');
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].filePath, 'Dockerfile');
  assert.equal(evidence[0].commitSha, 'abc123');
  assert.equal(evidence[0].snippet, 'FROM node:20-alpine');
});
