export interface PageResponse<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
  empty: boolean
}

export interface PageRequest {
  page: number
  size: number
  sort?: string
}

export interface ApiFieldError {
  field: string
  message: string
  rejectedValue?: unknown
}

export interface ApiError {
  status: number
  message: string
  path?: string
  timestamp?: string
  errors?: ApiFieldError[] | Record<string, string[]>
}
