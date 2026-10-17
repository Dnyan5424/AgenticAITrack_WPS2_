const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'unit-test-secret-that-is-long-enough-123';
process.env.GITHUB_CLIENT_ID = 'unit-test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'unit-test-client-secret';
process.env.GITHUB_REDIRECT_URI = 'http://localhost:5000/api/github/callback';
const { classify, assessmentExplanation, NOT_DEMONSTRATED, affectedSkills, evidenceCandidates } = require('../src/services/skillAssessmentService');
const { isPublicRepository, assertPublicRepository } = require('../src/services/githubService');
const { createAuthorization } = require('../src/services/oauthService');
const { parseJobDescription } = require('../src/services/jobParserService');
const { parseJobPage, inferJobFromUrl, isPublicAddress } = require('../src/services/jobUrlService');
const { loadRoles, rankRoles } = require('../src/services/jobRecommendationService');

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

test('job description parsing detects role titles in headings and prose', () => {
  assert.equal(parseJobDescription('Software Engineering Intern\nRequired: React.').title, 'Software Engineering Intern');
  assert.equal(parseJobDescription([
    'Job title: Senior Back-End Software Engineer',
    'Required: Node.js and SQL.'
  ].join('\n')).title, 'Senior Back-End Software Engineer');
  assert.equal(
    parseJobDescription('We are hiring a Staff Data Engineer to build analytics pipelines. Python required.').title,
    'Staff Data Engineer'
  );
  assert.equal(parseJobDescription('Requirements: Python, SQL, and strong communication.').title, 'Job role not detected');
});

test('job URL parsing extracts schema.org posting details and readable requirements', () => {
  const page = parseJobPage(`
    <title>Example role</title>
    <script type="application/ld+json">
      {"@type":"JobPosting","title":"Frontend Engineer","hiringOrganization":{"name":"Example Co"},
      "description":"Required: React, JavaScript and SQL. Preferred: Docker."}
    </script>
  `);
  assert.equal(page.title, 'Frontend Engineer');
  assert.equal(page.company, 'Example Co');
  assert.match(page.description, /React, JavaScript and SQL/);
  const parsed = parseJobDescription(page.description);
  assert.ok(parsed.requiredSkills.includes('React'));
  assert.ok(parsed.preferredSkills.includes('Docker'));
});

test('job URL reader rejects private and reserved network addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '169.254.1.1', '::1', 'fc00::1']) {
    assert.equal(isPublicAddress(address), false, `${address} must not be public`);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
});

test('role guide URLs infer job titles and skill requirements without scraping the page', () => {
  const posting = inferJobFromUrl('https://www.upwork.com/hire/back-end-developers/job-description/');
  assert.equal(posting.title, 'Back-End Developer');
  assert.match(posting.description, /Node\.js/);
  assert.match(posting.analysisNote, /inferred from words in the URL/);
  const requirements = parseJobDescription(posting.description);
  assert.ok(requirements.requiredSkills.includes('Node.js'));
  assert.ok(requirements.preferredSkills.includes('Docker'));
  assert.ok(!requirements.preferredSkills.includes('Node.js'));
  assert.equal(inferJobFromUrl('https://example.com/jobs/7462'), null);
});

test('licensed job-role catalog loads title, skill and description records', () => {
  const roles = loadRoles();
  assert.ok(roles.length >= 100);
  assert.ok(roles.every(role => role.title && role.skills.length && role.description));
});

test('job role ranking combines verified skill coverage with TF-IDF similarity', () => {
  const roles = [
    { title: 'Backend Developer', skills: ['Node.js', 'REST APIs', 'SQL'], description: 'Build backend services and APIs.' },
    { title: 'Graphic Designer', skills: ['Illustration', 'Brand Design'], description: 'Create visual brand campaigns.' }
  ];
  const [best, next] = rankRoles({
    roles,
    assessments: [
      { skill: 'Node.js', status: 'demonstrated' },
      { skill: 'API development', status: 'partial' },
      { skill: 'SQL', status: 'not_demonstrated_in_this_scope' }
    ],
    profileText: 'server endpoints routes and service code'
  });
  assert.equal(best.title, 'Backend Developer');
  assert.equal(best.skillCoverage, 50);
  assert.deepEqual(best.matchedSkills, ['Node.js', 'REST APIs']);
  assert.deepEqual(best.missingSkills, ['SQL']);
  assert.ok(best.match > next.match);
  assert.ok(best.textSimilarity > 0);
});

test('assessment status reflects the amount and kind of evidence', () => {
  const item = { evidenceType: 'source', filePath: 'src/server.js' };
  assert.equal(classify([item]).status, 'partial');
  assert.equal(classify([item, { ...item, evidenceType: 'test', filePath: 'test/server.test.js' }]).status, 'demonstrated');
});

test('assessment explanations are deterministic and scoped to repository evidence', () => {
  assert.equal(
    assessmentExplanation('JavaScript', [{}, {}]),
    '2 repository files contain direct JavaScript references. This is evidence within the configured repository scope, not a claim about skill outside it.'
  );
  assert.match(assessmentExplanation('Docker', []), /Not demonstrated in this scope/);
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
