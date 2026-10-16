import { get, EP, M, USE_MOCK } from './store'
export const evidenceService = { forSkill: (s: string) => USE_MOCK ? Promise.resolve(M.seedSkills().find(x => x.name === s)?.evidence ?? []) : get(EP.skillEvidence(s)) }
