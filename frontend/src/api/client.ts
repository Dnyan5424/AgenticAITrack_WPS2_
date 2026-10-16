import axios, { AxiosError } from 'axios'
import type { ApiResponse } from '../types'
const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')
export const BASE_URL = configuredApiBase.endsWith('/api') ? configuredApiBase : `${configuredApiBase}/api`
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true') === 'true'
export const api = axios.create({ baseURL: BASE_URL, timeout: 15000, withCredentials: true })
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('skillproof_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(r => r, (e: AxiosError<{ message?: string }>) => {
  if (e.response?.status === 401) sessionStorage.removeItem('skillproof_token')
  const msg = e.response?.data?.message || (e.code === 'ECONNABORTED' ? 'The request timed out. Try again.' : e.message === 'Network Error' ? `Cannot reach the backend at ${BASE_URL}. Check that it is running, or enable mock mode.` : e.message)
  return Promise.reject(new Error(msg))
})
export async function get<T>(url: string) { return (await api.get<ApiResponse<T>>(url)).data.data }
export async function post<T>(url: string, body?: unknown) { return (await api.post<ApiResponse<T>>(url, body)).data.data }
export async function patch<T>(url: string, body?: unknown) { return (await api.patch<ApiResponse<T>>(url, body)).data.data }
export async function del<T>(url: string) { return (await api.delete<ApiResponse<T>>(url)).data.data }
