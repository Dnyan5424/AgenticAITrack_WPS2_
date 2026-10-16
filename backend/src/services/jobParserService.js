const { canonicalSkill } = require('../utils/skillRules');

const SKILLS = [
  'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'SQL',
  'REST APIs', 'Automated testing', 'Docker', 'CI/CD', 'Authentication',
  'Python', 'Git', 'AWS', 'HTML/CSS', 'Java', 'C++', 'Redis', 'GraphQL',
  'Machine Learning', 'Data Analysis', 'Communication', 'Agile'
];
const PREFERRED_MARKERS = /\b(preferred|nice to have|bonus|ideally|plus|desired)\b/i;

function parseJobDescription(text) {
  const required = new Set();
  const preferred = new Set();
  const lines = text.split(/\r?\n/);
  for (const skill of SKILLS) {
    const matcher = new RegExp(`(^|[^\\w+#])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w+#]|$)`, 'i');
    const hits = lines.filter(line => matcher.test(line));
    if (!hits.length) continue;
    const target = hits.some(line => PREFERRED_MARKERS.test(line)) ? preferred : required;
    target.add(canonicalSkill(skill));
  }
  for (const skill of preferred) required.delete(skill);
  const title = lines.find(line => /\b(intern|engineer|developer|analyst|designer|scientist|manager)\b/i.test(line) && line.trim().length < 120)?.trim() || 'Role (from pasted text)';
  const companyMatch = text.match(/\b(?:at|with)\s+([A-Z][\w&.-]+(?:\s+[A-Z][\w&.-]+){0,3})/);
  return { title, company: companyMatch ? companyMatch[1] : 'Not detected', requiredSkills: [...required], preferredSkills: [...preferred] };
}

module.exports = { parseJobDescription };
