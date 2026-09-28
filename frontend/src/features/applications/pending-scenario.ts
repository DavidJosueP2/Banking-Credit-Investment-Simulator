import type { Scenario } from './applications-api'

const STORAGE_KEY = 'brunexa.pending-scenario'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export type ScenarioIntent = 'apply' | 'save'

interface Stored {
  scenario: Scenario
  intent: ScenarioIntent
  savedAt: number
}

/**
 * Conserva la simulación mientras la persona inicia sesión o se registra. Se usa sessionStorage:
 * sobrevive a las redirecciones de la pestaña, pero no queda en el equipo al cerrarla.
 */
export function rememberScenario(scenario: Scenario, intent: ScenarioIntent = 'apply') {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ scenario, intent, savedAt: Date.now() } satisfies Stored))
  } catch {
    // Sin almacenamiento disponible el flujo sigue: solo no se recordará la simulación.
  }
}

export function pendingScenario(intent: ScenarioIntent = 'apply'): Scenario | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Stored
    if (!stored?.scenario || Date.now() - stored.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return (stored.intent ?? 'apply') === intent ? stored.scenario : null
  } catch {
    return null
  }
}

export function forgetScenario() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nada que limpiar.
  }
}

export const NEW_APPLICATION_PATH = '/cliente/solicitudes/nueva'
export const CLIENT_HOME_PATH = '/cliente'
