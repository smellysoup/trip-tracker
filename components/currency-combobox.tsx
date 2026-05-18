"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CURRENCIES, currencyByCode } from "@/lib/currencies"

type Props = {
  value: string
  onValueChange: (code: string) => void
  disabled?: boolean
  id?: string
}

export default function CurrencyCombobox({
  value,
  onValueChange,
  disabled,
  id,
}: Props) {
  const [open, setOpen] = useState(false)
  const selected = value ? currencyByCode(value) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {selected ? selected.code : "Select currency…"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // Custom filter: items are keyed by "CODE name" — match either.
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }}
        >
          <CommandInput placeholder="Search code or name…" />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {CURRENCIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.code} ${c.name}`}
                  onSelect={() => {
                    onValueChange(c.code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === c.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono text-xs w-12">{c.code}</span>
                  <span className="ml-2 flex-1 truncate">{c.name}</span>
                  {c.symbol ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.symbol}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
