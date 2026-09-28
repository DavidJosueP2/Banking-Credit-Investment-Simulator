import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Bookmark, BookmarkCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useAuth } from '@/app/providers/auth-provider'
import { useInstitutionSettings } from '@/app/providers/settings-provider'
import { Button } from '@/components/ui/button'
import { messageFrom } from '@/features/identity-check/utils'
import { cn } from '@/lib/utils'

import { applicationKeys, saveSimulation, type Scenario } from './applications-api'
import { CLIENT_HOME_PATH, NEW_APPLICATION_PATH, rememberScenario } from './pending-scenario'

interface SimulationActionsProps {
  scenario: Scenario
  applyLabel?: string
  className?: string
}

/**
 * Puente entre un simulador público y el flujo autenticado: guarda la simulación o la convierte en
 * solicitud. Si no hay sesión, conserva el escenario y lo retoma después del ingreso o el registro.
 */
export function SimulationActions({ scenario, applyLabel, className }: SimulationActionsProps) {
  const { account, hasPermission } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [savedKey, setSavedKey] = useState('')
  const scenarioKey = JSON.stringify(scenario)
  const isCredit = scenario.productType === 'CREDIT'
  const { settings } = useInstitutionSettings()
  const onlineEnabled = isCredit || settings.investment.onlineApplicationEnabled === 'true'
  const canApply = onlineEnabled && (!account || hasPermission(isCredit ? 'credit.request.create' : 'investment.request.create'))
  const canSave = !account || hasPermission('simulation.save')

  const save = useMutation({
    mutationFn: () => saveSimulation(scenario),
    onSuccess: async () => {
      setSavedKey(scenarioKey)
      await client.invalidateQueries({ queryKey: applicationKeys.simulations })
      toast.success('Simulación guardada', {
        description: 'La encontrarás en tu espacio de cliente.',
        action: { label: 'Ver', onClick: () => navigate(CLIENT_HOME_PATH) },
      })
    },
    onError: (error) => toast.error(messageFrom(error, 'No se pudo guardar la simulación.')),
  })

  function apply() {
    rememberScenario(scenario, 'apply')
    navigate(account ? NEW_APPLICATION_PATH : `/login?next=${encodeURIComponent(NEW_APPLICATION_PATH)}`)
  }

  function saveOrSignIn() {
    if (account) {
      save.mutate()
      return
    }
    rememberScenario(scenario, 'save')
    navigate(`/login?next=${encodeURIComponent(CLIENT_HOME_PATH)}`)
  }

  if (!canApply && !canSave) return null
  const saved = savedKey === scenarioKey

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {canApply && (
        <Button type="button" variant="brand" onClick={apply} className="gap-1.5">
          {applyLabel ?? (isCredit ? 'Solicitar este crédito' : 'Continuar con la inversión')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      )}
      {canSave && (
        <Button type="button" variant="outline" onClick={saveOrSignIn} disabled={save.isPending || saved} className="gap-1.5">
          {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
          {saved ? 'Guardada' : save.isPending ? 'Guardando…' : 'Guardar simulación'}
        </Button>
      )}
      {!account && (
        <p className="basis-full text-xs text-muted-foreground">
          Te pediremos ingresar o crear tu cuenta; tu simulación se conservará.
        </p>
      )}
    </div>
  )
}
