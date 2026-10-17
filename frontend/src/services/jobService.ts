import { get, post, patch, EP, M, USE_MOCK, wait, type JobPosting, type JobRequirement, type JobRoleRecommendation, type SkillAssessment } from './store'
import { recommendRoles as recommendMockRoles } from '../utils'

const JOB_ANALYSIS_TIMEOUT = 120000

function inferRoleFromUrl(rawUrl: string): JobPosting | null {
  let path: string
  try {
    const parsed = new URL(rawUrl)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null
    path = decodeURIComponent(parsed.pathname).toLowerCase().replace(/[_-]+/g, ' ')
  } catch {
    return null
  }
  const role = [
    { match: /\b(back end|backend|server side)\b/, title: 'Back-End Developer', skills: ['Node.js', 'Express', 'Python', 'Java', 'SQL', 'REST APIs', 'MongoDB', 'Docker', 'AWS', 'Automated testing'] },
    { match: /\b(full stack|fullstack)\b/, title: 'Full-Stack Developer', skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'SQL', 'REST APIs', 'Git'] },
    { match: /\b(front end|frontend|web developer)\b/, title: 'Front-End Developer', skills: ['JavaScript', 'TypeScript', 'React', 'HTML/CSS', 'Automated testing', 'Git'] },
    { match: /\b(data analyst|data analytics)\b/, title: 'Data Analyst', skills: ['Python', 'SQL', 'Data Analysis', 'Machine Learning'] },
    { match: /\b(devops|site reliability)\b/, title: 'DevOps Engineer', skills: ['Docker', 'CI/CD', 'AWS', 'Python', 'Git', 'Automated testing'] }
  ].find(item => item.match.test(path))
  if (!role) return null
  return {
    id: `url-${Date.now()}`,
    title: role.title,
    company: 'Not detected from URL',
    sourceUrl: rawUrl,
    sample: false,
    requirements: role.skills.map(name => ({ name, required: !['Docker', 'AWS'].includes(name) })),
    analysisNote: 'Role and skills are inferred from words in the URL. Review and edit the suggested skills before assessment.'
  }
}

export const jobService = {
  async recommendations(): Promise<JobRoleRecommendation[]> {
    if (USE_MOCK) return recommendMockRoles(M.seedSkills())
    const result = await get<{ roles: JobRoleRecommendation[] }>(EP.jobRecommendations)
    return result.roles
  },
  async analyze(input: { url: string }): Promise<JobPosting> {
    if (USE_MOCK) {
      await wait(400)
      const inferred = inferRoleFromUrl(input.url)
      if (inferred) return inferred
      throw new Error('No role could be identified from this URL. Try a URL containing a role title or use the example job.')
    }
    return post(EP.jobsAnalyze, input, JOB_ANALYSIS_TIMEOUT)
  },
  list: () => USE_MOCK ? Promise.resolve([M.sampleJob()]) : get<JobPosting[]>(EP.jobs),
  sample: () => M.sampleJob(),
  update: (id: string, requirements: JobRequirement[]) => USE_MOCK ? Promise.resolve() : patch<JobPosting>(EP.job(id), { requirements }),
  async assess(id: string): Promise<{ skills: SkillAssessment[] } | undefined> {
    if (USE_MOCK) return undefined
    const report = await post<{ skills: Array<Omit<SkillAssessment, 'status' | 'category' | 'updatedAt'> & { status: string; required?: boolean }> }>(EP.jobAssess(id), undefined, JOB_ANALYSIS_TIMEOUT)
    return { skills: report.skills.map(skill => ({
      ...skill,
      category: skill.required ? 'required' : 'preferred',
      status: skill.status === 'not_demonstrated_in_this_scope' ? 'not_demonstrated' : skill.status as SkillAssessment['status'],
      updatedAt: new Date().toISOString()
    })) }
  }
}
