import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[] | undefined;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  staticOptions?: Option[];
}

export function SearchableSelect({
  value,
  onValueChange,
  options = [],
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  loading = false,
  disabled = false,
  className,
  staticOptions = [],
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const combinedOptions = [
    ...staticOptions,
    ...options,
  ];

  const filteredOptions = combinedOptions.filter((option) =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = combinedOptions.find((option) => option.id === value);

  return (
    <Popover open={open} onOpenChange={(val) => { setOpen(val); if (!val) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal bg-background/50 border border-input h-10 px-3 hover:bg-background/80 text-foreground",
            className
          )}
          disabled={disabled || loading}
          type="button"
        >
          <span className="truncate">
            {loading
              ? "Loading..."
              : selectedOption
              ? selectedOption.name
              : placeholder}
          </span>
          <span className="ml-2 h-4 w-4 shrink-0 opacity-50 text-xs">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border shadow-lg rounded-xl overflow-hidden max-h-[300px] flex flex-col z-50">
        <div className="p-2 border-b shrink-0">
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 shadow-none bg-background/50"
            autoFocus
          />
        </div>
        <div className="overflow-y-auto flex-1 max-h-[220px] py-1 custom-scrollbar">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onValueChange(option.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none flex items-center justify-between cursor-pointer",
                  value === option.id ? "bg-accent/50 font-medium" : ""
                )}
                type="button"
              >
                <span className="truncate">{option.name}</span>
                {value === option.id && (
                  <span className="text-primary font-bold text-xs">✓</span>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              {emptyMessage}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
