import axios from 'axios'
import { clearAccessToken, getAccessToken, getGuestId } from '../../features/auth/session'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Guest-Id'] = getGuestId()
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const currentToken = getAccessToken()
      const sentToken = error.config?.headers?.Authorization
      // A late 401 from a previous session must not invalidate a newer login.
      if (currentToken && sentToken === `Bearer ${currentToken}`) {
        clearAccessToken()
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('kurio:session-expired'))
      }
    }
    return Promise.reject(error)
  },
)
