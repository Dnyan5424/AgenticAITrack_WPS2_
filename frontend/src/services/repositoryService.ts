import { get, post, EP, M, USE_MOCK, wait, type Repository } from './store'
export const repositoryService = {
  list: () => USE_MOCK ? Promise.resolve([M.seedRepo()]) : get<Repository[]>('/repositories'),
  get: (id: string): Promise<Repository> => USE_MOCK ? Promise.resolve(M.seedRepo()) : get(EP.repo(id)),
  files: (id: string) => USE_MOCK ? Promise.resolve(M.seedRepo().files) : get(EP.repoFiles(id)),
  async analyze(id: string) { if (USE_MOCK) { await wait(900); return { analysisId: 'mock' } } return post<{ analysisId: string }>(EP.repoAnalyze(id)) },
  sync: (id: string) => USE_MOCK ? Promise.resolve() : post<void>(EP.repoSync(id))
}
