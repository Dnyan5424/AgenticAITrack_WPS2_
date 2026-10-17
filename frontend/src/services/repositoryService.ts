import { get, post, EP, M, USE_MOCK, wait, type Repository } from './store'
const REPOSITORY_ANALYSIS_TIMEOUT = 120000
export const repositoryService = {
  list: () => USE_MOCK ? Promise.resolve([M.seedRepo()]) : get<Repository[]>('/repositories'),
  get: (id: string): Promise<Repository> => USE_MOCK ? Promise.resolve(M.seedRepo()) : get(EP.repo(id), REPOSITORY_ANALYSIS_TIMEOUT),
  commits: (id: string) => USE_MOCK ? Promise.resolve(M.seedRepo().commits) : get<Repository['commits']>(EP.repoCommits(id)),
  files: (id: string) => USE_MOCK ? Promise.resolve(M.seedRepo().files) : get(EP.repoFiles(id), REPOSITORY_ANALYSIS_TIMEOUT),
  async analyze(id: string) { if (USE_MOCK) { await wait(900); return { analysisId: 'mock' } } return post<{ analysisId: string }>(EP.repoAnalyze(id), undefined, REPOSITORY_ANALYSIS_TIMEOUT) },
  sync: (id: string) => USE_MOCK ? Promise.resolve() : post<void>(EP.repoSync(id), undefined, REPOSITORY_ANALYSIS_TIMEOUT)
}
