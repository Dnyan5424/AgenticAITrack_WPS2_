import { get, EP, M, USE_MOCK, type SkillAssessment } from './store'
export const skillService = {
  careerDna: (): Promise<SkillAssessment[]> => USE_MOCK ? Promise.resolve(M.seedSkills()) : get(EP.careerDna),
  list: (): Promise<SkillAssessment[]> => USE_MOCK ? Promise.resolve(M.seedSkills()) : get(EP.skills),
  gapReport: (jobId: string) => USE_MOCK ? Promise.resolve(null) : get(EP.gap(jobId))
}
