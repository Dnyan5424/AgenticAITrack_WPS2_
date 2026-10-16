import { USE_MOCK, BASE_URL } from '../api/client'
import { get, post, EP, M, wait, type User } from './store'
export const authService = {
  loginWithGithub() { if (!USE_MOCK) window.location.href = BASE_URL + EP.authGithub },
  async connectDemo(): Promise<User> { await wait(); return M.DEMO_USER },
  me: (): Promise<User> => USE_MOCK ? Promise.resolve(M.DEMO_USER) : get<User>(EP.me),
  logout: () => USE_MOCK ? Promise.resolve() : post<void>(EP.logout)
}
