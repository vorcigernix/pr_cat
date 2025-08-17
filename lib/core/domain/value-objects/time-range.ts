/**
 * Time Range Value Object
 * Represents a period of time with validation
 */

export class TimeRange {
  private constructor(
    public readonly start: Date,
    public readonly end: Date
  ) {
    if (start >= end) {
      throw new Error('Start date must be before end date')
    }
  }

  static create(start: Date, end: Date): TimeRange {
    return new TimeRange(start, end)
  }

  static fromDays(days: number): TimeRange {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - days)
    return new TimeRange(start, end)
  }

  static fromPreset(preset: '7d' | '30d' | '90d'): TimeRange {
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 }
    return TimeRange.fromDays(daysMap[preset])
  }

  getDays(): number {
    return Math.ceil((this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24))
  }

  contains(date: Date): boolean {
    return date >= this.start && date <= this.end
  }

  toFilter(): { from: string; to: string } {
    return {
      from: this.start.toISOString(),
      to: this.end.toISOString()
    }
  }

  toString(): string {
    return `${this.start.toISOString()} to ${this.end.toISOString()}`
  }

  equals(other: TimeRange): boolean {
    return this.start.getTime() === other.start.getTime() && 
           this.end.getTime() === other.end.getTime()
  }
}

export type TimeRangePreset = '7d' | '30d' | '90d'

export interface TimeRangeFilter {
  from: string
  to: string
}
