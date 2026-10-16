import { get, EP, USE_MOCK, type RepositoryChange } from './store'
export const changeService = { list: (): Promise<RepositoryChange[]> => USE_MOCK ? Promise.resolve([]) : get(EP.changes), status: (id: string) => get<{ state: string }>(EP.analysisStatus(id)) }
