export const EP = {
  authGithub: '/auth/github', authLogin: '/auth/login', authRegister: '/auth/register', me: '/auth/me', logout: '/auth/logout',
  forgotPassword: '/auth/forgot-password', resetPassword: '/auth/reset-password', deleteAccount: '/auth/me',
  connection: '/github/connection', ghRepos: '/github/repositories', ghConnect: '/github/repositories/connect',
  repo: (id: string) => `/repositories/${id}`, repoFiles: (id: string) => `/repositories/${id}/files`,
  repoAnalyze: (id: string) => `/repositories/${id}/analyze`, repoSync: (id: string) => `/repositories/${id}/sync`,
  jobsAnalyze: '/jobs/analyze', jobs: '/jobs', job: (id: string) => `/jobs/${id}`, jobReport: (id: string) => `/jobs/${id}/report`, jobAssess: (id: string) => `/jobs/${id}/assess`,
  careerDna: '/career-dna', skills: '/skills', skillEvidence: (s: string) => `/skills/${encodeURIComponent(s)}/evidence`, gap: (id: string) => `/gap-reports/${id}`,
  changes: '/changes', change: (id: string) => `/changes/${id}`, analysis: (id: string) => `/analysis/${id}`, analysisStatus: (id: string) => `/analysis/${id}/status`,
  roadmap: (id: string) => `/roadmaps/${id}`, task: (id: string) => `/roadmap/tasks/${id}`, resume: '/resume/analyze'
}
