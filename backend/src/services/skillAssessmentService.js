const SkillAssessment = require('../models/SkillAssessment');
const SkillEvidence = require('../models/SkillEvidence');
const GapReport = require('../models/GapReport');
const { RULES, ruleFor, canonicalSkill } = require('../utils/skillRules');
const env = require('../config/env');

const NOT_DEMONSTRATED = 'not_demonstrated_in_this_scope';

function matchesTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^\\w+#])${escaped}([^\\w+#]|$)`, 'i').test(text);
}

function evidenceKind(path) {
  if (/(\.test\.|\.spec\.|\/tests?\/|_test\.|Test\.java)/i.test(path)) return 'test';
  if (/^readme/i.test(path.split('/').pop()) || /\.(md|mdx|rst)$/i.test(path)) return 'documentation';
  if (/docker|\.ya?ml$|\.toml$|\.json$|\.properties$/i.test(path)) return 'configuration';
  return 'source';
}

function evidenceCandidates(skill, files, commitSha) {
  const rule = ruleFor(skill);
  const candidates = [];
  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    const extensionMatch = rule.extensionIsEvidence && rule.extensions.some(extension => file.path.toLowerCase().endsWith(extension));
    const pathMatch = rule.pathIsEvidence && rule.pathPattern?.test(file.path.replace(/\\/g, '/'));
    // Select the most informative line, rather than the first incidental mention.
    const matchIndex = lines.reduce((bestIndex, line, index) => {
      const score = rule.terms.reduce((total, term) => total + Number(matchesTerm(line, term)), 0);
      return score > bestIndex.score ? { index, score } : bestIndex;
    }, { index: -1, score: 0 }).index;
    const selectedLine = matchIndex >= 0 ? matchIndex : extensionMatch || pathMatch ? lines.findIndex(line => line.trim()) : -1;
    if (selectedLine < 0) continue;
    const snippet = lines.slice(Math.max(0, selectedLine - 2), Math.min(lines.length, selectedLine + 3)).join('\n').trim().slice(0, env.AI_EVIDENCE_SNIPPET_CHARS);
    if (!snippet) continue;
    candidates.push({
      evidenceType: evidenceKind(file.path),
      filePath: file.path,
      fileUrl: file.url,
      commitSha,
      commitMessage: file.commitMessage || '',
      snippet,
      explanation: pathMatch && matchIndex < 0
        ? `This analyzed repository contains a ${canonicalSkill(skill)} configuration file at ${file.path}.`
        : extensionMatch && matchIndex < 0
          ? `This analyzed source file uses the ${canonicalSkill(skill)} file extension.`
          : `${canonicalSkill(skill)} is referenced in this ${evidenceKind(file.path)} file.`
    });
  }
  return candidates;
}

function classify(candidates) {
  if (!candidates.length) return { status: NOT_DEMONSTRATED, confidence: 0.2 };
  const hasImplementation = candidates.some(item => item.evidenceType === 'source');
  const hasTests = candidates.some(item => item.evidenceType === 'test');
  const hasMultiple = new Set(candidates.map(item => item.filePath)).size > 1;
  if (hasImplementation && (hasTests || hasMultiple)) return { status: 'demonstrated', confidence: hasTests ? 0.9 : 0.78 };
  return { status: 'partial', confidence: 0.55 };
}

function assessmentExplanation(skill, supporting) {
  if (!supporting.length) {
    return 'Not demonstrated in this scope. The configured repository files analyzed for this job did not contain verifiable evidence for this skill.';
  }
  return `${supporting.length} repository file${supporting.length === 1 ? '' : 's'} contain direct ${skill} references. This is evidence within the configured repository scope, not a claim about skill outside it.`;
}

async function assessSkills({ user, job, repository, snapshot, skills, onlySkills = null }) {
  const targetSkills = onlySkills || [...new Set([...job.requiredSkills, ...job.preferredSkills])];
  const results = [];
  for (const requestedSkill of targetSkills) {
    const skill = canonicalSkill(requestedSkill);
    const candidates = evidenceCandidates(skill, snapshot.files, snapshot.commitSha);
    const classification = classify(candidates);
    const supporting = classification.status === NOT_DEMONSTRATED ? [] : candidates;
    const reason = assessmentExplanation(skill, supporting);
    const assessment = await SkillAssessment.findOneAndUpdate(
      { user: user._id, job: job._id, repository: repository._id, skill },
      { $set: {
        status: classification.status,
        confidence: classification.confidence,
        reason,
        gap: classification.status === NOT_DEMONSTRATED ? 'Not demonstrated in this scope.' : classification.status === 'partial' ? `Add tests and/or a second verifiable implementation example for ${skill}.` : '',
        analyzedCommitSha: snapshot.commitSha
      } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    await SkillEvidence.deleteMany({ assessment: assessment._id });
    if (supporting.length) {
      await SkillEvidence.insertMany(supporting.map(item => ({ ...item, assessment: assessment._id })), { ordered: false });
    }
    results.push(assessment);
  }
  return results;
}

function isSkillAffected(skill, changedFiles, fileData = []) {
  const rule = ruleFor(skill);
  const byPath = changedFiles.some(path =>
    rule.extensions.some(extension => path.toLowerCase().endsWith(extension)) ||
    (rule.pathPattern && rule.pathPattern.test(path.replace(/\\/g, '/'))) ||
    rule.terms.some(term => matchesTerm(path, term))
  );
  const byContent = fileData.some(file => rule.terms.some(term => matchesTerm(file.content, term)));
  const skillMentioned = changedFiles.some(path => rule.terms.some(term => matchesTerm(path, term)));
  return byPath || byContent || skillMentioned;
}

function affectedSkills(changedFiles, fileData = []) {
  return RULES.filter(rule => isSkillAffected(rule.skill, changedFiles, fileData)).map(rule => rule.skill);
}

async function refreshGaps(user, job, onlySkills = null) {
  const assessments = await SkillAssessment.find({ user: user._id, job: job._id });
  const bySkill = new Map();
  for (const assessment of assessments) {
    const previous = bySkill.get(assessment.skill);
    if (!previous || assessment.confidence > previous.confidence) bySkill.set(assessment.skill, assessment);
  }
  const allSkills = [...new Set([...job.requiredSkills, ...job.preferredSkills])];
  const skills = onlySkills
    ? allSkills.filter(name => onlySkills.some(item => item.toLowerCase() === name.toLowerCase()))
    : allSkills;
  for (const skillName of skills) {
    const skill = canonicalSkill(skillName);
    const assessment = bySkill.get(skill);
    const required = job.requiredSkills.includes(skillName);
    const notShown = !assessment || assessment.status === NOT_DEMONSTRATED;
    const partial = assessment?.status === 'partial';
    if (!notShown && !partial) {
      await GapReport.deleteOne({ user: user._id, job: job._id, skill });
      continue;
    }
    const reason = assessment?.reason || 'No configured repository has been assessed for this skill.';
    await GapReport.findOneAndUpdate(
      { user: user._id, job: job._id, skill },
      { $set: {
        gapLevel: notShown ? (required ? 'critical' : 'preferred') : 'moderate',
        reason,
        missingEvidence: notShown ? [`Verifiable ${skill} implementation evidence`, 'Relevant test or configuration evidence'] : [`Additional independent evidence for ${skill}`],
        recommendation: notShown ? `Create or configure a focused project demonstrating ${skill}, then add source and test evidence.` : `Add tests or another independent example that demonstrates ${skill}.`,
        suggestedProject: `Build a small, documented project that uses ${skill} and includes automated tests.`
      } },
      { upsert: true, new: true, runValidators: true }
    );
  }
}

function reportFrom(assessments, job) {
  const allSkills = [...new Set([...job.requiredSkills, ...job.preferredSkills])];
  const aggregate = allSkills.map(skill => {
    const rows = assessments.filter(row => row.skill.toLowerCase() === skill.toLowerCase());
    const best = rows.find(row => row.status === 'demonstrated') || rows.find(row => row.status === 'partial') || rows[0];
    return { name: skill, required: job.requiredSkills.includes(skill), status: best?.status || NOT_DEMONSTRATED, confidence: best?.confidence || 0, reason: best?.reason || 'Not demonstrated in this scope.', evidence: [] };
  });
  const weight = { demonstrated: 1, partial: 0.5, [NOT_DEMONSTRATED]: 0 };
  const required = aggregate.filter(item => item.required);
  const preferred = aggregate.filter(item => !item.required);
  const scoreRows = required.length ? [...required, ...preferred.map(item => ({ ...item, _weight: 0.5 }))] : aggregate;
  const denominator = scoreRows.reduce((sum, item) => sum + (item._weight || 1), 0);
  const score = denominator ? Math.round(scoreRows.reduce((sum, item) => sum + weight[item.status] * (item._weight || 1), 0) / denominator * 100) : 0;
  return {
    score,
    skills: aggregate,
    critical: aggregate.filter(item => item.required && item.status === NOT_DEMONSTRATED),
    moderate: aggregate.filter(item => item.required && item.status === 'partial'),
    preferred: aggregate.filter(item => !item.required && item.status !== 'demonstrated'),
    insufficient: aggregate.filter(item => item.status === NOT_DEMONSTRATED),
    summary: `${score}% weighted evidence coverage across ${aggregate.length} distinct job skills. A score of 0 means this scope supplied no matching evidence; it is not a measure of a person's ability.`
  };
}

module.exports = { NOT_DEMONSTRATED, classify, assessmentExplanation, assessSkills, affectedSkills, isSkillAffected, refreshGaps, reportFrom, evidenceCandidates };
