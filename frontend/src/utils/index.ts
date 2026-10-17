import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { JobPosting, SkillAssessment, Status } from '../types'
export const cn = (...a: ClassValue[]) => twMerge(clsx(a))
export const STATUS_LABEL: Record<Status, string> = { demonstrated: 'Demonstrated', partial: 'Partially demonstrated', not_demonstrated: 'Not demonstrated in this scope', under_review: 'Under review' }
export const STATUS_CLASS: Record<Status, string> = { demonstrated: 'text-ok bg-green-50 border-green-200', partial: 'text-part bg-amber-light border-amber-200', not_demonstrated: 'text-none bg-slate-100 border-slate-200', under_review: 'text-review bg-blue-50 border-blue-200' }
export const fmt = (iso?: string) => iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
export const POINTS = { reqDemo: 10, reqPart: 5, prefDemo: 3, prefPart: 1 }
export function fitScore(job: JobPosting | null, skills: SkillAssessment[]) {
  if (!job) return { score: 0, got: 0, max: 0 }
  let got = 0, max = 0
  for (const r of job.requirements) {
    max += r.required ? POINTS.reqDemo : POINTS.prefDemo
    const s = skills.find(x => x.name.toLowerCase() === r.name.toLowerCase())
    if (!s) continue
    if (s.status === 'demonstrated') got += r.required ? POINTS.reqDemo : POINTS.prefDemo
    if (s.status === 'partial') got += r.required ? POINTS.reqPart : POINTS.prefPart
  }
  return { score: max ? Math.round((got / max) * 100) : 0, got, max }
}

const ROLE_SKILLS = [
  { title: 'Back-End Developer', skills: ['API development', 'Node.js', 'Express', 'Python', 'Java', 'SQL', 'MongoDB', 'REST APIs', 'Docker', 'AWS'] },
  { title: 'Full-Stack Developer', skills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Express', 'SQL', 'REST APIs', 'Git'] },
  { title: 'Front-End Developer', skills: ['React', 'JavaScript', 'TypeScript', 'HTML/CSS', 'Automated testing', 'Git'] },
  { title: 'Data Analyst', skills: ['Python', 'SQL', 'Data Analysis', 'Machine Learning'] },
  { title: 'DevOps Engineer', skills: ['Docker', 'CI/CD', 'AWS', 'Python', 'Git', 'Automated testing'] }
] as const

export function recommendRoles(skills: SkillAssessment[]) {
  return ROLE_SKILLS.map(role => {
    const matchedSkills = role.skills.flatMap(name => {
      const assessment = skills.find(skill => skill.name.toLowerCase() === name.toLowerCase())
      return assessment && ['demonstrated', 'partial'].includes(assessment.status)
        ? [{ name, status: assessment.status }]
        : []
    })
    const points = matchedSkills.reduce((total, skill) => total + (skill.status === 'demonstrated' ? 1 : 0.5), 0)
    const missingSkills = role.skills.filter(name => !matchedSkills.some(skill => skill.name === name))
    const skillCoverage = role.skills.length ? Math.round((points / role.skills.length) * 100) : 0
    return {
      title: role.title,
      match: skillCoverage,
      skillCoverage,
      textSimilarity: 0,
      matchedSkills: matchedSkills.map(skill => skill.name),
      missingSkills,
      description: 'Role suggestion based on assessed repository skills.'
    }
  }).sort((left, right) => right.match - left.match)
}
