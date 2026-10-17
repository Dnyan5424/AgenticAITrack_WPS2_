import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import { Dashboard, Settings } from './pages/Core'
import { JobAnalyzer, JobFit, Gaps } from './pages/Jobs'
import { Changes } from './pages/Activity'
import EvidenceExplorer from './pages/EvidenceExplorer'
import Onboarding from './pages/Onboarding'
const AIMentor = lazy(() => import('./pages/AIMentor'))
const AIRoadmap = lazy(() => import('./pages/AIRoadmap'))
export default function App() {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-ink2">Loading…</div>}><Routes>
    <Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route element={<AppLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/changes" element={<Changes />} />
      <Route path="/evidence" element={<EvidenceExplorer />} />
      <Route path="/job-analyzer" element={<JobAnalyzer />} />
      <Route path="/job-fit" element={<Navigate to="/job-analyzer" replace />} />
      <Route path="/gaps" element={<Gaps />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/ai-mentor" element={<AIMentor />} /><Route path="/ai-roadmap" element={<AIRoadmap />} />
      <Route path="/repositories" element={<Navigate to="/dashboard" replace />} />
      <Route path="/repositories/:id" element={<Navigate to="/dashboard" replace />} />
      <Route path="/career-dna" element={<Navigate to="/dashboard" replace />} />
      <Route path="/roadmap" element={<Navigate to="/dashboard" replace />} />
      <Route path="/resume" element={<Navigate to="/dashboard" replace />} />
    </Route><Route path="*" element={<Navigate to="/" />} /></Routes></Suspense>
}
