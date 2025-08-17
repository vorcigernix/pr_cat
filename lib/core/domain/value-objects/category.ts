/**
 * Category Value Object
 * Represents a PR categorization with validation
 */

export class Category {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly color: string
  ) {
    if (!id.trim()) {
      throw new Error('Category ID cannot be empty')
    }
    if (!name.trim()) {
      throw new Error('Category name cannot be empty')
    }
    if (!this.isValidColor(color)) {
      throw new Error('Category color must be a valid hex color')
    }
  }

  static create(
    id: string,
    name: string,
    description: string | null = null,
    color: string
  ): Category {
    return new Category(id, name, description, color)
  }

  private isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  }

  equals(other: Category): boolean {
    return this.id === other.id
  }

  toString(): string {
    return this.name
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      color: this.color
    }
  }
}

export interface CategorySummary {
  id: string
  name: string
  color: string
  count?: number
  percentage?: number
}

export const UNCATEGORIZED_CATEGORY = Category.create(
  'uncategorized',
  'Uncategorized',
  'Pull requests that have not been categorized yet',
  '#6b7280'
)
