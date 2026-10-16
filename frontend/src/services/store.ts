import { USE_MOCK, get, post, patch, del } from '../api/client'
import { EP } from '../api/endpoints'
import type { Repository, JobPosting, SkillAssessment, RepositoryChange, RoadmapTask, ResumeClaim, User } from '../types'
import * as M from './mock'
const wait = (ms = 500) => new Promise(r => setTimeout(r, ms))
export { M }
export { USE_MOCK }
export { get, post, patch, del, EP, wait }
export type { Repository, JobPosting, SkillAssessment, RepositoryChange, RoadmapTask, ResumeClaim, User }
