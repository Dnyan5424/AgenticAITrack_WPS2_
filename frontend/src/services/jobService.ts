import { get, post, EP, M, USE_MOCK, wait, type JobPosting } from './store'
export const jobService = {
  async analyze(input: { url?: string; text: string }): Promise<JobPosting> {
    if (USE_MOCK) { await wait(900); const reqs = M.extractRequirements(input.text); return { id: 'j' + Date.now(), title: /intern/i.test(input.text) ? 'Internship (from pasted text)' : 'Role (from pasted text)', company: 'Not detected', sourceUrl: input.url || '', sample: false, requirements: reqs } }
    return post(EP.jobsAnalyze, input)
  },
  list: () => USE_MOCK ? Promise.resolve([M.sampleJob()]) : get<JobPosting[]>(EP.jobs),
  sample: () => M.sampleJob(),
  assess: (id: string) => USE_MOCK ? Promise.resolve() : post<void>(EP.jobAssess(id))
}
