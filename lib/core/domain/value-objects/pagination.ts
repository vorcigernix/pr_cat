/**
 * Pagination Value Object
 * Represents pagination parameters with validation
 */

export class Pagination {
  private constructor(
    public readonly page: number,
    public readonly limit: number,
    public readonly offset: number,
    public readonly total?: number
  ) {
    if (page < 1) {
      throw new Error('Page must be greater than 0')
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }
  }

  static create(page: number = 1, limit: number = 10, total?: number): Pagination {
    const offset = (page - 1) * limit
    return new Pagination(page, limit, offset, total)
  }

  static fromQuery(query: { page?: string; limit?: string; total?: number }): Pagination {
    const page = query.page ? Math.max(1, parseInt(query.page)) : 1
    const limit = query.limit ? Math.min(100, Math.max(1, parseInt(query.limit))) : 10
    return Pagination.create(page, limit, query.total)
  }

  hasNext(): boolean {
    if (!this.total) return false
    return this.offset + this.limit < this.total
  }

  hasPrev(): boolean {
    return this.page > 1
  }

  getTotalPages(): number {
    if (!this.total) return 1
    return Math.ceil(this.total / this.limit)
  }

  getNextPage(): Pagination | null {
    if (!this.hasNext()) return null
    return Pagination.create(this.page + 1, this.limit, this.total)
  }

  getPrevPage(): Pagination | null {
    if (!this.hasPrev()) return null
    return Pagination.create(this.page - 1, this.limit, this.total)
  }

  withTotal(total: number): Pagination {
    return new Pagination(this.page, this.limit, this.offset, total)
  }

  toQuery(): { page: number; limit: number; offset: number } {
    return {
      page: this.page,
      limit: this.limit,
      offset: this.offset
    }
  }
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
