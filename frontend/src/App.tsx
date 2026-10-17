import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import { Dashboard, CareerDNA, Repositories, RepoDetails, Settings } from './pages/Core'
import { JobAnalyzer, JobFit, Gaps } from './pages/Jobs'
import { Changes, Roadmap, Resume } from './pages/Activity'
import EvidenceExplorer from './pages/EvidenceExplorer'
import { ForgotPassword, ResetPassword } from './pages/PasswordRecovery'
import Onboarding from './pages/Onboarding'
export default function App() {
  return <Routes>
    <Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} />
    <Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/onboarding" element={<Onboarding />} />
    <Route element={<AppLayout />}>
      <Route path="/dashboard" element={<Dashboard />} /><Route path="/career-dna" element={<CareerDNA />} />
      <Route path="/repositories" element={<Repositories />} /><Route path="/repositories/:id" element={<RepoDetails />} />
      <Route path="/evidence" element={<EvidenceExplorer />} /><Route path="/changes" element={<Changes />} />
      <Route path="/job-analyzer" element={<JobAnalyzer />} /><Route path="/job-fit" element={<JobFit />} /><Route path="/gaps" element={<Gaps />} />
      <Route path="/roadmap" element={<Roadmap />} /><Route path="/resume" element={<Resume />} /><Route path="/settings" element={<Settings />} />
    </Route><Route path="*" element={<Navigate to="/" />} /></Routes>
}
