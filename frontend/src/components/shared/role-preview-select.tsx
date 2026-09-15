import { roles, roleLabels, type Role } from '@/app/access/permissions'
import { useDemoAccess } from '@/app/providers/demo-access-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function RolePreviewSelect() {
  const { role, setRole } = useDemoAccess()

  return (
    <Select
      value={role}
      onValueChange={(value) => {
        if (roles.some((option) => option === value)) setRole(value as Role)
      }}
    >
      <SelectTrigger
        className="w-39 max-w-full sm:w-48 [&_[data-slot=select-value]]:truncate"
        aria-label="Perfil de demostración"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((option) => (
          <SelectItem key={option} value={option}>
            {roleLabels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
