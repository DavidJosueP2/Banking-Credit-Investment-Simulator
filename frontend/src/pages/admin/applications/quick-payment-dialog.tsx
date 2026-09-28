import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  applicationKeys, getReviewDetail, hasPaymentMismatch, registerPayment, type ApplicationSummary,
} from '@/features/applications/applications-api'
import { messageFrom } from '@/features/identity-check/utils'
import { formatCurrency, formatDate } from '@/lib/formatters'

/** Desde Cartera: solo confirma la siguiente cuota pactada; montos distintos se registran en el expediente. */
export function QuickPaymentDialog({ row, onClose }: { row: ApplicationSummary; onClose: () => void }) {
  const client = useQueryClient()
  const [paidAt, setPaidAt] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const detail = useQuery({
    queryKey: applicationKeys.review(row.id),
    queryFn: () => getReviewDetail(row.id),
    refetchOnMount: 'always',
  })
  const application = detail.data?.application
  const next = application?.schedule.find((item) => item.number === application.paidThroughInstallment + 1)
  const mismatched = application && hasPaymentMismatch(application)
  const canRegister = detail.data?.actions.canRegisterPayment && next && application?.status === 'APPROVED' && !mismatched
  const today = format(new Date(), 'yyyy-MM-dd')

  const payment = useMutation({
    mutationFn: () => registerPayment(row.id, { paidAt, note: note.trim() || undefined }),
    onSuccess: (updated) => {
      client.setQueryData(applicationKeys.review(row.id), updated)
      void client.invalidateQueries({ queryKey: applicationKeys.queue })
      toast.success(`Pago de la cuota N.º ${next!.number} registrado para ${row.customerName}.`)
      onClose()
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    if (canRegister && !detail.isFetching && paidAt && paidAt <= today) payment.mutate()
  }

  return (
    <Dialog open onOpenChange={(value) => { if (!value && !payment.isPending) onClose() }}>
      <DialogContent showCloseButton={!payment.isPending}>
        <DialogHeader>
          <DialogTitle>Registrar siguiente pago</DialogTitle>
          <DialogDescription>{row.customerName} · {row.code}. Confirma solo si ya recibiste el pago.</DialogDescription>
        </DialogHeader>
        {detail.isFetching ? <p className="text-sm text-muted-foreground">Verificando la próxima cuota…</p>
          : detail.isError ? <p role="alert" className="text-sm text-destructive">{messageFrom(detail.error, 'No se pudo consultar el expediente.')}</p>
            : !canRegister ? <p className="text-sm text-muted-foreground">{mismatched
              ? 'Hay pagos anteriores por montos distintos a las cuotas. Corrígelos en el expediente antes de registrar otro.'
              : 'Ya no se puede registrar este pago. La cartera pudo cambiar; revisa el expediente.'}</p>
              : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                    <p className="font-medium">{application.productType === 'CREDIT' ? 'Cuota' : 'Pago'} N.º {next.number} · {formatCurrency(next.payment)}</p>
                    <p className="mt-1 text-muted-foreground">Vence {formatDate(next.dueDate)} · se registra solo la cuota completa</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`quick-paid-at-${row.id}`}>Fecha real del pago</Label>
                    <Input id={`quick-paid-at-${row.id}`} type="date" required max={today} value={paidAt}
                      onChange={(event) => setPaidAt(event.target.value)} disabled={payment.isPending} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`quick-note-${row.id}`}>Nota (opcional)</Label>
                    <Input id={`quick-note-${row.id}`} maxLength={200} value={note} disabled={payment.isPending}
                      placeholder="Transferencia, efectivo…" onChange={(event) => setNote(event.target.value)} />
                  </div>
                  <p className="text-xs text-muted-foreground">Si el pago fue parcial, no lo marques como cuota completa: este sistema aún no administra abonos parciales.</p>
                  {payment.isError && <p role="alert" className="text-sm text-destructive">{messageFrom(payment.error, 'No se pudo registrar el pago. Verifica el expediente antes de reintentar.')}</p>}
                  <DialogFooter>
                    <Button type="button" variant="outline" disabled={payment.isPending} onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="brand" disabled={payment.isPending || detail.isFetching}>
                      {payment.isPending ? 'Registrando…' : `Confirmar ${formatCurrency(next.payment)}`}
                    </Button>
                  </DialogFooter>
                </form>
              )}
        {!detail.isFetching && (!canRegister || detail.isError) && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
            <Button asChild variant="brand"><Link to={`/admin/solicitudes/${row.id}`} onClick={onClose}>Abrir expediente</Link></Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
