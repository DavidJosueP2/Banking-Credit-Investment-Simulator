import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface DataTableSkeletonProps {
  columnCount?: number
  rowCount?: number
  className?: string
}

export function DataTableSkeleton({
  columnCount = 5,
  rowCount = 6,
  className,
}: DataTableSkeletonProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-xl border', className)}
      aria-label="Cargando tabla"
      aria-busy="true"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {Array.from({ length: columnCount }, (_, index) => (
              <TableHead key={`header-${index}`}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }, (_, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {Array.from({ length: columnCount }, (_, columnIndex) => (
                <TableCell key={`cell-${rowIndex}-${columnIndex}`}>
                  <Skeleton
                    className={cn(
                      'h-4',
                      columnIndex === 0 ? 'w-32' : 'w-20',
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
