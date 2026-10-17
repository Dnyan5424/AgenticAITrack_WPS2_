export type Status = 'demonstrated' | 'partial' | 'not_demonstrated' | 'under_review'
export type Freshness = 'fresh' | 'changes' | 'in_progress' | 'failed'
export interface User { id: string; name: string; email: string; githubLogin?: string; demo: boolean }
export interface Commit { sha: string; message: string; date: string; files: string[]; url?: string }
export interface RepositoryFile { path: string; kind: 'source' | 'sql' | 'test' | 'deploy' | 'doc'; excerpt: string; explanation: string }
export interface Repository { id: string; name: string; repoFullName?: string; language: string; branch: string; latestSha: string; analyzedSha: string; analyzedAt: string; description: string; files: RepositoryFile[]; commits: Commit[] }
export interface JobRequirement { name: string; required: boolean }
export interface JobPosting { id: string; title: string; company: string; sourceUrl: string; sample: boolean; requirements: JobRequirement[] }
export interface SkillEvidence { repo: string; file: string; excerpt: string; commit: string; explanation: string; url?: string }
export interface SkillAssessment { name: string; category: string; status: Status; confidence: number; evidence: SkillEvidence[]; updatedAt: string; previous?: Status; gap?: string; improvement?: string }
export interface EvidenceGraphNode { id: string; type: 'job' | 'skill' | 'repo' | 'file' | 'commit'; label: string; col: number }
export interface EvidenceGraphEdge { from: string; to: string }
export interface GapReport { critical: SkillAssessment[]; moderate: SkillAssessment[]; preferred: SkillAssessment[]; insufficient: SkillAssessment[] }
export interface RepositoryChange { id: string; repo: string; message: string; sha: string; files: string[]; affected: string[]; before: Record<string, Status>; after?: Record<string, Status>; state: 'pending' | 'reassessing' | 'complete' | 'failed'; detectedAt: string; completedAt?: string; simulated: boolean }
export interface RoadmapTask { id: string; plan: '7-day' | '30-day'; title: string; artifact: string; skill: string; done: boolean }
export interface LearningRoadmap { tasks: RoadmapTask[] }
export interface ResumeClaim { claim: string; verdict: 'supported' | 'partial' | 'not_in_scope'; note: string }
export interface ApiResponse<T> { data: T; message?: string }
