import { get, patch, EP, M, USE_MOCK, type RoadmapTask } from './store'
export const roadmapService = { get: (jobId: string): Promise<RoadmapTask[]> => USE_MOCK ? Promise.resolve(M.seedTasks()) : get(EP.roadmap(jobId)), toggle: (id: string, done: boolean) => USE_MOCK ? Promise.resolve() : patch<void>(EP.task(id), { done }) }
