const ResumeClaim = require('../models/ResumeClaim');
const SkillAssessment = require('../models/SkillAssessment');
const SkillEvidence = require('../models/SkillEvidence');
const { canonicalSkill } = require('../utils/skillRules');
const { NOT_DEMONSTRATED } = require('./skillAssessmentService');

async function analyzeResume(user, text) {
  const assessments = await SkillAssessment.find({ user: user._id }).sort({ updatedAt: -1 });
  const latest = new Map();
  const rank = { demonstrated: 3, partial: 2, [NOT_DEMONSTRATED]: 1 };
  for (const assessment of assessments) {
    const previous = latest.get(assessment.skill);
    if (!previous || rank[assessment.status] > rank[previous.status]) latest.set(assessment.skill, assessment);
  }
  const claims = [];
  for (const [skill, assessment] of latest) {
    const match = text.match(new RegExp(`(^|[^\\w+#])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w+#]|$)`, 'i'));
    if (!match) continue;
    const evidence = assessment.status === NOT_DEMONSTRATED
      ? []
      : await SkillEvidence.find({ assessment: assessment._id }).limit(3);
    const supported = assessment.status === 'demonstrated' && evidence.length > 0;
    const evidenceStatus = supported ? 'supported' : assessment.status === 'partial' && evidence.length ? 'partial' : NOT_DEMONSTRATED;
    const explanation = supported
      ? `Repository evidence supports this claim within the configured scope (${evidence.map(item => item.filePath).join(', ')}).`
      : evidenceStatus === 'partial'
        ? `Only partial repository evidence was found (${evidence.map(item => item.filePath).join(', ')}).`
        : 'Not demonstrated in this scope. This does not mean the skill is absent; the configured repositories did not provide verifiable evidence.';
    const record = await ResumeClaim.create({ user: user._id, claim: match[0].trim(), evidenceStatus, explanation, matchedSkills: [canonicalSkill(skill)] });
    claims.push({ claim: record.claim, verdict: evidenceStatus === NOT_DEMONSTRATED ? 'not_in_scope' : evidenceStatus, note: explanation, evidenceStatus, matchedSkills: record.matchedSkills });
  }
  return claims;
}

module.exports = { analyzeResume };
