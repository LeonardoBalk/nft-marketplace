import { z } from 'zod'
import type { AuthUser } from '../features/auth/contracts'

const databaseKey = 'kurio.demo.auth-database.v1'
const databaseSchema = z.object({
  users: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    avatarUrl: z.string().nullable(),
    salt: z.string(),
    passwordHash: z.string(),
  })),
  sessions: z.array(z.object({
    token: z.string(),
    userId: z.string(),
    expiresAt: z.string(),
  })),
})

type Database = z.infer<typeof databaseSchema>
type StoredUser = Database['users'][number]

const demoAccounts = [
  { id: 'collector-test', name: 'Test', email: 'test@kurio.test', password: 'Kurio@2026', salt: 'kurio-demo-test-v1', legacyId: 'collector-ana' },
  { id: 'collector-test-2', name: 'Test 2', email: 'test2@kurio.test', password: 'Kurio@2026', salt: 'kurio-demo-test-2-v1', legacyId: 'collector-caio' },
]

let databasePromise: Promise<Database> | undefined

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120_000 }, key, 256)
  return toHex(new Uint8Array(bits))
}

function saveDatabase(database: Database): void {
  localStorage.setItem(databaseKey, JSON.stringify(database))
}

function migrateDemoAccounts(database: Database): Database {
  let changed = false

  for (const account of demoAccounts) {
    const user = database.users.find((entry) => entry.id === account.id || entry.id === account.legacyId)
    if (!user) continue

    const previousId = user.id
    if (previousId !== account.id) {
      user.id = account.id
      for (const session of database.sessions) {
        if (session.userId === previousId) session.userId = account.id
      }
      changed = true
    }
    if (user.name !== account.name) {
      user.name = account.name
      changed = true
    }
    if (user.email !== account.email) {
      user.email = account.email
      changed = true
    }
  }

  if (changed) saveDatabase(database)
  return database
}

async function initializeDatabase(): Promise<Database> {
  try {
    const stored = localStorage.getItem(databaseKey)
    if (stored) {
      const parsed = databaseSchema.safeParse(JSON.parse(stored))
      if (parsed.success) return migrateDemoAccounts(parsed.data)
    }
  } catch {
    // reconstruir o estado simulado
  }

  const users: StoredUser[] = await Promise.all(demoAccounts.map(async (account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    avatarUrl: null,
    salt: account.salt,
    passwordHash: await hashPassword(account.password, account.salt),
  })))
  const database: Database = { users, sessions: [] }
  saveDatabase(database)
  return database
}

async function getDatabase(): Promise<Database> {
  databasePromise ??= initializeDatabase()
  const database = await databasePromise
  try {
    const stored = localStorage.getItem(databaseKey)
    const parsed = stored ? databaseSchema.safeParse(JSON.parse(stored)) : null
    if (parsed?.success) return migrateDemoAccounts(parsed.data)
  } catch {
    // usar o estado em memória
  }
  return database
}

export async function registerMockUser(input: { name: string; email: string; password: string }): Promise<{ user: AuthUser; accessToken: string; expiresAt: string } | 'EMAIL_CONFLICT'> {
  const database = await getDatabase()
  const email = input.email.trim().toLocaleLowerCase('en-US')
  if (database.users.some((user) => user.email === email)) return 'EMAIL_CONFLICT'

  const salt = crypto.randomUUID()
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    avatarUrl: null,
    salt,
    passwordHash: await hashPassword(input.password, salt),
  }
  database.users.push(user)
  return createSession(database, user)
}

export async function loginMockUser(input: { email: string; password: string }): Promise<{ user: AuthUser; accessToken: string; expiresAt: string } | 'INVALID_CREDENTIALS'> {
  const database = await getDatabase()
  const email = input.email.trim().toLocaleLowerCase('en-US')
  const user = database.users.find((entry) => entry.email === email)
  if (!user || await hashPassword(input.password, user.salt) !== user.passwordHash) return 'INVALID_CREDENTIALS'
  return createSession(database, user)
}

function createSession(database: Database, storedUser: StoredUser) {
  const accessToken = `kurio-demo-${crypto.randomUUID()}`
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  database.sessions = database.sessions.filter((session) => session.userId !== storedUser.id)
  database.sessions.push({ token: accessToken, userId: storedUser.id, expiresAt })
  saveDatabase(database)
  return {
    user: toPublicUser(storedUser),
    accessToken,
    expiresAt,
  }
}

function toPublicUser(user: StoredUser): AuthUser {
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }
}

export async function changeMockPassword(userId: string, currentPassword: string, newPassword: string): Promise<'OK' | 'INVALID_PASSWORD'> {
  const database = await getDatabase()
  const user = database.users.find((entry) => entry.id === userId)
  if (!user || await hashPassword(currentPassword, user.salt) !== user.passwordHash) return 'INVALID_PASSWORD'
  const salt = crypto.randomUUID()
  user.salt = salt
  user.passwordHash = await hashPassword(newPassword, salt)
  saveDatabase(database)
  return 'OK'
}

export async function updateMockUser(userId: string, patch: { name?: string; email?: string; avatarUrl?: string | null }): Promise<AuthUser | 'EMAIL_CONFLICT' | null> {
  const database = await getDatabase()
  const user = database.users.find((entry) => entry.id === userId)
  if (!user) return null
  if (patch.email) {
    const email = patch.email.trim().toLocaleLowerCase('en-US')
    if (database.users.some((entry) => entry.email === email && entry.id !== userId)) return 'EMAIL_CONFLICT'
    user.email = email
  }
  if (patch.name) user.name = patch.name.trim()
  if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl
  saveDatabase(database)
  return toPublicUser(user)
}

export async function getMockSession(token: string | null): Promise<AuthUser | null> {
  if (!token) return null
  const database = await getDatabase()
  const session = database.sessions.find((entry) => entry.token === token)
  if (!session) return null
  if (Date.parse(session.expiresAt) <= Date.now()) {
    database.sessions = database.sessions.filter((entry) => entry.token !== token)
    saveDatabase(database)
    return null
  }
  const user = database.users.find((entry) => entry.id === session.userId)
  return user ? toPublicUser(user) : null
}

export async function deleteMockSession(token: string | null): Promise<void> {
  if (!token) return
  const database = await getDatabase()
  database.sessions = database.sessions.filter((session) => session.token !== token)
  saveDatabase(database)
}

export async function expireMockSession(token: string | null): Promise<boolean> {
  if (!token) return false
  const database = await getDatabase()
  const session = database.sessions.find((entry) => entry.token === token)
  if (!session) return false
  session.expiresAt = new Date(Date.now() - 1).toISOString()
  saveDatabase(database)
  return true
}

export async function authenticateMockRequest(request: Request): Promise<AuthUser | null> {
  const authorization = request.headers.get('authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null
  return getMockSession(token)
}

export function resetMockAuthStore(): void {
  databasePromise = undefined
  localStorage.removeItem(databaseKey)
}
