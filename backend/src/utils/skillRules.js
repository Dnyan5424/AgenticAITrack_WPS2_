const RULES = [
  { skill: 'JavaScript', terms: ['javascript', 'ecmascript'], extensions: ['.js', '.cjs', '.mjs'], extensionIsEvidence: true },
  { skill: 'Node.js', terms: ['node.js', 'nodejs', 'express'], extensions: [] },
  { skill: 'TypeScript', terms: ['typescript', 'type safety'], extensions: ['.ts', '.tsx'], extensionIsEvidence: true },
  { skill: 'React', terms: ['react', 'react.js'], extensions: ['.jsx', '.tsx'] },
  { skill: 'MongoDB', terms: ['mongodb', 'mongoose'], extensions: [] },
  { skill: 'SQL', terms: ['sql', 'postgresql', 'mysql', 'sqlite'], extensions: ['.sql'], extensionIsEvidence: true },
  { skill: 'REST APIs', terms: ['rest api', 'restful', 'express.router'], extensions: [] },
  { skill: 'Automated testing', terms: ['jest', 'vitest', 'mocha', 'supertest', 'pytest'], extensions: ['.test.js', '.spec.js', '.test.ts', '.spec.ts'], pathPattern: /(^|\/)(__tests__|tests?)(\/|$)|\.(test|spec)\.[^/]+$/i, pathIsEvidence: true },
  { skill: 'Docker', terms: ['docker', 'dockerfile', 'docker-compose'], extensions: [], pathPattern: /(^|\/)(dockerfile|docker-compose(?:\.[^/]+)?|\.dockerignore)(\/|$)/i, pathIsEvidence: true },
  { skill: 'CI/CD', terms: ['github actions', 'continuous integration', 'workflow'], extensions: [], pathPattern: /(^|\/)(\.github\/workflows|\.circleci|jenkinsfile|\.gitlab-ci\.yml)(\/|$)/i, pathIsEvidence: true },
  { skill: 'Authentication', terms: ['authentication', 'jwt', 'bcrypt', 'oauth'], extensions: [], pathPattern: /(^|\/|[._-])(auth|authentication|jwt|login)([._/-]|$)/i },
  { skill: 'Python', terms: ['python', 'fastapi', 'django'], extensions: ['.py'], extensionIsEvidence: true },
  { skill: 'Git', terms: ['git', 'github'], extensions: [] },
  { skill: 'AWS', terms: ['aws', 's3', 'lambda', 'ec2'], extensions: [] },
  { skill: 'HTML/CSS', terms: ['html', 'css', 'tailwind'], extensions: ['.html', '.css'], extensionIsEvidence: true }
];

function canonicalSkill(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const rule = RULES.find(item => item.skill.toLowerCase() === normalized || item.terms.includes(normalized));
  return rule ? rule.skill : String(value || '').trim();
}

function ruleFor(skill) {
  const canonical = canonicalSkill(skill).toLowerCase();
  return RULES.find(item => item.skill.toLowerCase() === canonical) || {
    skill: String(skill || ''),
    terms: [String(skill || '').toLowerCase()],
    extensions: []
  };
}

module.exports = { RULES, canonicalSkill, ruleFor };
