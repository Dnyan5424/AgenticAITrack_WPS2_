import { del, get, patch, post } from './client'

const AI_GENERATION_TIMEOUT = 120000

export type AIMessage = { role: 'user' | 'model'; text: string; _id?: string; createdAt?: string }
export type ConversationSummary = { _id: string; title: string; createdAt: string; updatedAt: string }
export type AIConversation = ConversationSummary & { messages: AIMessage[] }
export type RoadmapTask = {
  _id: string; title: string; description: string; estimatedMinutes: number
  resourceUrl: string; exercise: string; completionCriteria: string
  status: 'todo' | 'in_progress' | 'completed'
}
export type RoadmapWeek = { _id?: string; week: number; title: string; objective: string; tasks: RoadmapTask[] }
export type PersonalizedRoadmap = {
  _id: string; goal: string; currentLevel: string; hoursPerWeek: number
  durationWeeks: number; summary: string; skillsToImprove: string[]; weeks: RoadmapWeek[]
}

export const aiApi = {
  listConversations: () => get<{ conversations: ConversationSummary[] }>('/ai/conversations'),
  getConversation: (id: string) => get<{ conversation: AIConversation }>(`/ai/conversations/${id}`),
  deleteConversation: (id: string) => del<null>(`/ai/conversations/${id}`),
  sendMessage: (body: { message: string; conversationId?: string }) => post<{ conversationId: string; reply: string }>('/ai/chat', body, AI_GENERATION_TIMEOUT),
  currentRoadmap: () => get<{ roadmap: PersonalizedRoadmap | null }>('/ai/roadmaps/current'),
  generateRoadmap: (body: { goal: string; currentLevel: string; hoursPerWeek: number; durationWeeks: number; skillsToImprove: string[] }) => post<{ roadmap: PersonalizedRoadmap }>('/ai/roadmaps/generate', body, AI_GENERATION_TIMEOUT),
  updateTask: (roadmapId: string, taskId: string, status: RoadmapTask['status']) => patch<{ roadmap: PersonalizedRoadmap }>(`/ai/roadmaps/${roadmapId}/tasks/${taskId}`, { status }),
}
