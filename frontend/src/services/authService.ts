import { USE_MOCK, BASE_URL } from '../api/client'
import { get, post, EP, M, wait, type User } from './store'

const TOKEN_KEY = 'skillproof_token'

export const authService = {
  loginWithGithub() { if (!USE_MOCK) window.location.href = BASE_URL + EP.authGithub },
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
