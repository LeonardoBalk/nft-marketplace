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
    if (axios.isAxiosError(error) && error.response?.status === 401) clearAccessToken()
    return Promise.reject(error)
  },
)
