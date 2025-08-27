"use client"

import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type TimeRangeValue = "7d" | "14d" | "30d" | "90d"

interface TimeRangeOption {
  value: TimeRangeValue;
  label: string;
  description: string;
}

interface SimpleTimeRangePickerProps {
  value?: TimeRangeValue;
  onValueChange: (value: TimeRangeValue) => void;
  className?: string;
}

const timeRangeOptions: TimeRangeOption[] = [
  { value: "7d", label: "Last 7 days", description: "Past week" },
  { value: "14d", label: "Last 14 days", description: "Past 2 weeks" },
  { value: "30d", label: "Last 30 days", description: "Past month" },
  { value: "90d", label: "Last 90 days", description: "Past quarter" },
];

export function SimpleTimeRangePicker({
  value = "30d",
  onValueChange,
  className = ""
}: SimpleTimeRangePickerProps) {
  const selectedOption = timeRangeOptions.find(option => option.value === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`w-[200px] ${className}`}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        <SelectValue>
          {selectedOption?.label || "Select time range"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {timeRangeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex flex-col">
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
