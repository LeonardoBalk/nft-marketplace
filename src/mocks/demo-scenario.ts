import { z } from 'zod'

const storageKey = 'kurio.demo.scenario.v1'

const failureSchema = z.object({
  method: z.string().toUpperCase().optional(),
  path: z.string().min(1),
  kind: z.enum(['offline', 'http']),
  status: z.number().int().min(400).max(599).optional(),
  remaining: z.number().int().min(1).max(10).default(1),
}).nullable()

const scenarioSchema = z.object({
  latencyMs: z.number().int().min(0).max(5_000),
  latencySequenceMs: z.array(z.number().int().min(0).max(5_000)).max(20),
  nextFailure: failureSchema,
  paymentOutcome: z.enum(['confirmed', 'declined']),
  walletOutcome: z.enum(['connected', 'refused', 'disconnected']),
  walletDisconnectDuringCheckout: z.boolean(),
  settlementDelayMs: z.number().int().min(0).max(60_000),
  timeoutAfterOrderCreation: z.boolean(),
  dropOrderEvents: z.boolean(),
  duplicateOrderEvents: z.boolean(),
  staleOrderEvent: z.boolean(),
})

export type DemoScenario = z.infer<typeof scenarioSchema>

const defaultScenario: DemoScenario = {
  latencyMs: 0,
  latencySequenceMs: [],
  nextFailure: null,
  paymentOutcome: 'confirmed',
  walletOutcome: 'connected',
  walletDisconnectDuringCheckout: false,
  settlementDelayMs: 650,
  timeoutAfterOrderCreation: false,
  dropOrderEvents: false,
  duplicateOrderEvents: false,
  staleOrderEvent: false,
}

let latencyCursor = 0

function readScenario(): DemoScenario {
  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = raw ? scenarioSchema.safeParse(JSON.parse(raw)) : null
    if (parsed?.success) return parsed.data
  } catch {
    return { ...defaultScenario }
  }
  return { ...defaultScenario }
}

function saveScenario(scenario: DemoScenario): DemoScenario {
  localStorage.setItem(storageKey, JSON.stringify(scenario))
  return scenario
}

export function getDemoScenario(): DemoScenario {
  return readScenario()
}

export function updateDemoScenario(input: unknown): DemoScenario | null {
  const parsed = scenarioSchema.partial().safeParse({ ...readScenario(), ...(input && typeof input === 'object' ? input : {}) })
  if (!parsed.success) return null
  latencyCursor = 0
  return saveScenario(scenarioSchema.parse(parsed.data))
}

export function resetDemoScenario(): DemoScenario {
  latencyCursor = 0
  return saveScenario({ ...defaultScenario })
}

export function takeMockNetworkBehavior(method: string, pathname: string) {
  const scenario = readScenario()
  const latency = scenario.latencySequenceMs.length
    ? scenario.latencySequenceMs[latencyCursor++ % scenario.latencySequenceMs.length]
    : scenario.latencyMs
  const failure = scenario.nextFailure
  if (failure && failure.path === pathname && (!failure.method || failure.method === method.toUpperCase())) {
    saveScenario({ ...scenario, nextFailure: failure.remaining > 1 ? { ...failure, remaining: failure.remaining - 1 } : null })
    return { latency, failure }
  }
  return { latency, failure: null }
}

export function clearDemoScenarioStorage(): void {
  latencyCursor = 0
  localStorage.removeItem(storageKey)
}
