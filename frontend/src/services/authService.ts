import { USE_MOCK, BASE_URL } from '../api/client'
import { get, post, EP, M, wait, type User } from './store'

const TOKEN_KEY = 'skillproof_token'

interface AuthResult { user: User; token: string }

async function authenticate(endpoint: string, credentials: Record<string, string>): Promise<User> {
  const result = await post<AuthResult>(endpoint, credentials)
  sessionStorage.setItem(TOKEN_KEY, result.token)
  return { ...result.user, demo: false }
}

export const authService = {
  loginWithGithub() { if (!USE_MOCK) window.location.href = BASE_URL + EP.authGithub },
  login(credentials: { email: string; password: string }): Promise<User> {
    return authenticate(EP.authLogin, credentials)
  },
  register(credentials: { name: string; email: string; password: string }): Promise<User> {
    return authenticate(EP.authRegister, credentials)
  },
  consumeOAuthCallback(): boolean {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('token')
    if (!token) return false
    sessionStorage.setItem(TOKEN_KEY, token)
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    return true
  },
  hasToken: () => Boolean(sessionStorage.getItem(TOKEN_KEY)),
  clearToken: () => sessionStorage.removeItem(TOKEN_KEY),
  async connectDemo(): Promise<User> { await wait(); return M.DEMO_USER },
  me: (): Promise<User> => USE_MOCK ? Promise.resolve(M.DEMO_USER) : get<User>(EP.me),
  async logout() {
    if (USE_MOCK) return
    try {
      await post<void>(EP.logout)
    } finally {
      this.clearToken()
    }
  }
}
