const { canonicalSkill } = require('../utils/skillRules');

const SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'SQL',
  'REST APIs', 'Automated testing', 'Docker', 'CI/CD', 'Authentication',
  'Python', 'Git', 'AWS', 'HTML/CSS', 'Java', 'C++', 'Redis', 'GraphQL',
  'Machine Learning', 'Data Analysis', 'Communication', 'Agile'
];
const PREFERRED_MARKERS = /\b(preferred|nice to have|bonus|ideally|plus|desired)\b/i;
const SECTION_MARKERS = /\b(preferred|nice to have|bonus|ideally|plus|desired|required|must have|requirements)\b/ig;
const TITLE_WORDS = '(?:senior|junior|staff|principal|lead|associate|entry.level|back[ -]?end|front[ -]?end|full[ -]?stack|software|engineering|data|machine learning|web|mobile|cloud|devops|site reliability|quality assurance|product|ux|ui|security|platform|qa|android|ios)';
const TITLE_ROLES = '(?:engineer|developer|analyst|designer|scientist|manager|architect|administrator|specialist|consultant|technician|programmer|intern|product owner|qa tester|tester)';
const JOB_TITLE_PATTERN = new RegExp(`\\b(?:(?:${TITLE_WORDS})\\s+){0,4}(?:${TITLE_ROLES})\\b`, 'i');

function isPreferredAt(line, position) {
  let preferred = null;
  for (const match of line.matchAll(SECTION_MARKERS)) {
    if (match.index > position) break;
    preferred = PREFERRED_MARKERS.test(match[0]);
  }
  return preferred ?? PREFERRED_MARKERS.test(line);
}

function extractJobTitle(text) {
  const fragments = text.slice(0, 12000).split(/\r?\n|(?<=[.!?])\s+|[|•]/);
  for (const fragment of fragments) {
    const candidate = fragment
      .replace(/^[\s#>*-]+/, '')
      .replace(/^(?:job title|position|role|vacancy)\s*[:\-]\s*/i, '')
      .replace(/^(?:we(?:'re| are)\s+(?:hiring|looking for)|hiring|seeking)\s+(?:an?\s+)?/i, '')
      .trim();
    if (!candidate || candidate.length > 240) continue;
    const match = candidate.match(JOB_TITLE_PATTERN);
    if (match) return match[0].replace(/\s+/g, ' ').trim();
  }
  return 'Job role not detected';
}

function parseJobDescription(text) {
  const required = new Set();
  const preferred = new Set();
  const lines = text.split(/\r?\n/);
  for (const skill of SKILLS) {
    const matcher = new RegExp(`(^|[^\\w+#])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w+#]|$)`, 'gi');
    const hits = lines.flatMap(line => [...line.matchAll(matcher)].map(match => ({ line, position: match.index })));
    if (!hits.length) continue;
    const target = hits.some(hit => isPreferredAt(hit.line, hit.position)) ? preferred : required;
    target.add(canonicalSkill(skill));
  }
  for (const skill of preferred) required.delete(skill);
  const title = extractJobTitle(text);
  const companyMatch = text.match(/\b(?:at|with)\s+([A-Z][\w&.-]+(?:\s+[A-Z][\w&.-]+){0,3})/);
  return { title, company: companyMatch ? companyMatch[1] : 'Not detected', requiredSkills: [...required], preferredSkills: [...preferred] };
}

module.exports = { parseJobDescription };
