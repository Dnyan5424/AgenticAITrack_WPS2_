import { get, del, post, EP, M, USE_MOCK, wait, type Repository } from './store'
export const githubService = {
  connection: () => USE_MOCK ? Promise.resolve({ connected: true, login: M.DEMO_USER.githubLogin }) : get<{ connected: boolean; login?: string }>(EP.connection),
  async repositories(): Promise<Repository[]> { if (USE_MOCK) { await wait(); return [M.seedRepo()] } return get(EP.ghRepos) },
  connectRepo: (id: string) => USE_MOCK ? Promise.resolve() : post<void>(EP.ghConnect, { id }),
  disconnectRepo: (id: string) => USE_MOCK ? Promise.resolve() : del<void>(EP.ghRepos + '/' + id)
}
