import { post, EP, USE_MOCK, wait, type ResumeClaim, type SkillAssessment } from './store'
export const resumeService = {
  async analyze(text: string, skills: SkillAssessment[]): Promise<ResumeClaim[]> {
    if (!USE_MOCK) return post(EP.resume, { text })
    await wait(700)
    return skills.filter(s => text.toLowerCase().includes(s.name.toLowerCase())).map(s => s.status === 'demonstrated'
      ? { claim: s.name, verdict: 'supported', note: `Evidence in ${s.evidence[0]?.file}.` } : s.status === 'partial'
      ? { claim: s.name, verdict: 'partial', note: s.gap || 'Limited evidence found.' } : { claim: s.name, verdict: 'not_in_scope', note: 'Not demonstrated in the analyzed repositories. This does not mean the skill is absent.' })
  }
}
