import { get, post, patch, EP, M, USE_MOCK, wait, type JobPosting, type JobRequirement, type SkillAssessment } from './store'
export const jobService = {
  async analyze(input: { url?: string; text: string }): Promise<JobPosting> {
    if (USE_MOCK) { await wait(900); const reqs = M.extractRequirements(input.text); return { id: 'j' + Date.now(), title: /intern/i.test(input.text) ? 'Internship (from pasted text)' : 'Role (from pasted text)', company: 'Not detected', sourceUrl: input.url || '', sample: false, requirements: reqs } }
    return post(EP.jobsAnalyze, input)
  },
  list: () => USE_MOCK ? Promise.resolve([M.sampleJob()]) : get<JobPosting[]>(EP.jobs),
  sample: () => M.sampleJob(),
  update: (id: string, requirements: JobRequirement[]) => USE_MOCK ? Promise.resolve() : patch<JobPosting>(EP.job(id), { requirements }),
  async assess(id: string): Promise<{ skills: SkillAssessment[] } | undefined> {
    if (USE_MOCK) return undefined
    const report = await post<{ skills: Array<Omit<SkillAssessment, 'status' | 'category' | 'updatedAt'> & { status: string; required?: boolean }> }>(EP.jobAssess(id))
    return { skills: report.skills.map(skill => ({
      ...skill,
      category: skill.required ? 'required' : 'preferred',
      status: skill.status === 'not_demonstrated_in_this_scope' ? 'not_demonstrated' : skill.status as SkillAssessment['status'],
      updatedAt: new Date().toISOString()
    })) }
  }
}
