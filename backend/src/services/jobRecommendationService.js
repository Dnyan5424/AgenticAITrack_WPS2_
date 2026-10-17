const fs = require('node:fs');
const path = require('node:path');

const DATASET_PATH = path.join(__dirname, '..', '..', 'data', 'job_titles_and_descriptions.csv');
const STATUS_STRENGTH = { demonstrated: 1, partial: 0.5 };
const SKILL_ALIASES = new Map([
  ['api development', 'api'],
  ['rest api', 'api'],
  ['rest apis', 'api'],
  ['restful api', 'api'],
  ['restful apis', 'api'],
  ['automated testing', 'testing'],
  ['software testing', 'testing'],
  ['unit testing', 'testing'],
  ['test automation', 'testing'],
  ['ci cd', 'continuous integration'],
  ['continuous integration', 'continuous integration'],
  ['continuous delivery', 'continuous integration'],
  ['node js', 'node'],
  ['nodejs', 'node'],
  ['javascript', 'javascript'],
  ['js', 'javascript'],
  ['typescript', 'typescript'],
  ['ts', 'typescript'],
  ['html css', 'html css'],
  ['html', 'html'],
  ['css', 'css'],
  ['machine learning', 'machine learning'],
  ['ml', 'machine learning'],
  ['data analytics', 'data analysis'],
  ['data analysis', 'data analysis'],
  ['postgresql', 'postgresql'],
  ['postgres', 'postgresql'],
  ['mongodb', 'mongodb'],
  ['mongo db', 'mongodb'],
  ['amazon web services', 'aws'],
  ['aws', 'aws']
]);
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'our', 'that', 'the', 'their', 'this', 'to',
  'using', 'we', 'with', 'you'
]);

let cachedRoles;

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    if (row.some(value => value.trim())) rows.push(row);
  }
  if (quoted) throw new Error('Job-role dataset contains an unterminated CSV field.');
  if (!rows.length) throw new Error('Job-role dataset is empty.');

  const headers = rows.shift().map(header => header.replace(/^\uFEFF/, '').trim().toLowerCase());
  const titleIndex = headers.indexOf('job title');
  const skillsIndex = headers.indexOf('skills');
  const descriptionIndex = headers.indexOf('job description');
  if ([titleIndex, skillsIndex, descriptionIndex].some(index => index < 0)) {
    throw new Error('Job-role dataset must include Job Title, Skills and Job Description columns.');
  }

  const roles = rows.map(values => ({
    title: (values[titleIndex] || '').trim(),
    skills: (values[skillsIndex] || '').split(',').map(skill => skill.trim()).filter(Boolean),
    description: (values[descriptionIndex] || '').trim()
  })).filter(role => role.title && role.skills.length && role.description);
  if (!roles.length) throw new Error('Job-role dataset contains no usable job records.');
  return roles;
}

function loadRoles() {
  if (!cachedRoles) cachedRoles = parseCsv(fs.readFileSync(DATASET_PATH, 'utf8'));
  return cachedRoles;
}

function normalizeSkill(skill) {
  const normalized = skill.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim().replace(/\s+/g, ' ');
  return SKILL_ALIASES.get(normalized) || normalized;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .match(/[a-z0-9+#.]+/g)
    ?.filter(token => token.length > 1 && !STOP_WORDS.has(token)) || [];
}

function createIdf(documents) {
  const documentFrequency = new Map();
  for (const document of documents) {
    for (const token of new Set(document)) {
      documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    }
  }
  return new Map([...documentFrequency].map(([token, frequency]) => [
    token,
    Math.log((documents.length + 1) / (frequency + 1)) + 1
  ]));
}

function vectorize(tokens, idf, documentCount) {
  const frequencies = new Map();
  for (const token of tokens) frequencies.set(token, (frequencies.get(token) || 0) + 1);
  return new Map([...frequencies].map(([token, frequency]) => [
    token,
    (1 + Math.log(frequency)) * (idf.get(token) || Math.log(documentCount + 1) + 1)
  ]));
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (const [token, value] of left) {
    leftMagnitude += value * value;
    dot += value * (right.get(token) || 0);
  }
  for (const value of right.values()) rightMagnitude += value * value;
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function strengthFor(requirement, assessments) {
  const wanted = normalizeSkill(requirement);
  return assessments.reduce((best, assessment) => {
    if (normalizeSkill(assessment.skill) !== wanted) return best;
    return Math.max(best, STATUS_STRENGTH[assessment.status] || 0);
  }, 0);
}

function rankRoles({ roles, assessments, profileText = '', limit = 5 }) {
  const documents = roles.map(role => tokenize(`${role.title} ${role.skills.join(' ')} ${role.description}`));
  const idf = createIdf(documents);
  const profileTokens = tokenize(`${assessments.map(item => item.skill).join(' ')} ${profileText}`);
  const profileVector = vectorize(profileTokens, idf, documents.length);

  return roles.map((role, index) => {
    const matchedSkills = [];
    const missingSkills = [];
    let coverage = 0;
    for (const skill of role.skills) {
      const strength = strengthFor(skill, assessments);
      if (strength) {
        coverage += strength;
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }
    const skillCoverage = role.skills.length ? coverage / role.skills.length : 0;
    const similarity = cosineSimilarity(profileVector, vectorize(documents[index], idf, documents.length));
    return {
      title: role.title,
      match: Math.round((skillCoverage * 0.8 + similarity * 0.2) * 100),
      skillCoverage: Math.round(skillCoverage * 100),
      textSimilarity: Math.round(similarity * 100),
      matchedSkills,
      missingSkills,
      description: role.description,
      datasetSkills: role.skills
    };
  }).sort((left, right) => right.match - left.match || left.title.localeCompare(right.title)).slice(0, limit);
}

function recommendRoles(assessments, evidence = []) {
  const roles = loadRoles();
  const profileText = evidence.map(item => `${item.filePath || ''} ${item.explanation || ''}`).join(' ');
  return rankRoles({ roles, assessments, profileText });
}

module.exports = { parseCsv, loadRoles, normalizeSkill, tokenize, cosineSimilarity, rankRoles, recommendRoles };
