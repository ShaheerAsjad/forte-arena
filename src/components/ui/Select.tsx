"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  description?: string;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  size?: "sm" | "md" | "lg";
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      id,
      name,
      value: controlledValue,
      defaultValue,
      onChange,
      onBlur,
      options = [],
      placeholder = "Select an option...",
      label,
      error,
      hint,
      disabled = false,
      required = false,
      className,
      triggerClassName,
      size = "md",
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const listboxId = `${selectId}-listbox`;

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(
      controlledValue !== undefined
        ? controlledValue
        : defaultValue !== undefined
        ? defaultValue
        : options[0]?.value || ""
    );

    const selectedValue = isControlled ? controlledValue : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listboxRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    const shouldReduceMotion = useReducedMotion();

    // Typeahead buffer
    const typeaheadQueryRef = useRef("");
    const typeaheadTimerRef = useRef<NodeJS.Timeout | null>(null);

    useImperativeHandle(ref, () => triggerRef.current as HTMLButtonElement);

    // Sync controlled value changes
    useEffect(() => {
      if (isControlled && controlledValue !== undefined) {
        setInternalValue(controlledValue);
      }
    }, [isControlled, controlledValue]);

    const selectedOption = options.find((opt) => opt.value === selectedValue);

    // Click outside listener
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
          onBlur?.();
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }, [isOpen, onBlur]);

    // Update highlighted index when opening
    useEffect(() => {
      if (isOpen) {
        const idx = options.findIndex((opt) => opt.value === selectedValue);
        setHighlightedIndex(idx >= 0 ? idx : 0);
      }
    }, [isOpen, options, selectedValue]);

    // Scroll active item into view
    useEffect(() => {
      if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
        const item = listboxRef.current.children[highlightedIndex] as HTMLElement;
        if (item) {
          item.scrollIntoView({ block: "nearest" });
        }
      }
    }, [isOpen, highlightedIndex]);

    const selectValue = (val: string) => {
      const opt = options.find((o) => o.value === val);
      if (opt?.disabled) return;

      if (!isControlled) {
        setInternalValue(val);
      }

      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = val;
        // Dispatch synthetic event for form tracking
        const event = new Event("change", { bubbles: true });
        hiddenInputRef.current.dispatchEvent(event);
      }

      if (onChange) {
        onChange(val);
      }

      setIsOpen(false);
      triggerRef.current?.focus();
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;

      if (!isOpen) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          onBlur?.();
          break;

        case "Tab":
          setIsOpen(false);
          onBlur?.();
          break;

        case "ArrowDown": {
          e.preventDefault();
          let next = highlightedIndex + 1;
          while (next < options.length && options[next]?.disabled) {
            next++;
          }
          if (next < options.length) {
            setHighlightedIndex(next);
          }
          break;
        }

        case "ArrowUp": {
          e.preventDefault();
          let prev = highlightedIndex - 1;
          while (prev >= 0 && options[prev]?.disabled) {
            prev--;
          }
          if (prev >= 0) {
            setHighlightedIndex(prev);
          }
          break;
        }

        case "Enter":
        case " ": {
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            const opt = options[highlightedIndex];
            if (opt && !opt.disabled) {
              selectValue(opt.value);
            }
          }
          break;
        }

        default: {
          // Typeahead support: matching alphanumeric keys
          if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            if (typeaheadTimerRef.current) {
              clearTimeout(typeaheadTimerRef.current);
            }

            typeaheadQueryRef.current += e.key.toLowerCase();
            typeaheadTimerRef.current = setTimeout(() => {
              typeaheadQueryRef.current = "";
            }, 500);

            const matchIndex = options.findIndex(
              (opt) =>
                !opt.disabled &&
                opt.label.toLowerCase().startsWith(typeaheadQueryRef.current)
            );

            if (matchIndex >= 0) {
              setHighlightedIndex(matchIndex);
            }
          }
          break;
        }
      }
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-xs rounded-lg min-h-[34px]",
      md: "px-3.5 py-2.5 text-sm rounded-xl min-h-[42px]",
      lg: "px-4 py-3 text-base rounded-2xl min-h-[48px]",
    }[size];

    const SelectedIcon = selectedOption?.icon;

    return (
      <div ref={containerRef} className={cn("w-full space-y-1.5", className)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            onClick={() => triggerRef.current?.focus()}
            className="block text-xs sm:text-sm font-semibold text-navy-950 cursor-pointer"
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}

        {/* Hidden Input for Form Submissions */}
        <input
          type="hidden"
          ref={hiddenInputRef}
          name={name}
          value={selectedValue}
        />

        <div className="relative">
          {/* Button Trigger */}
          <button
            ref={triggerRef}
            id={selectId}
            type="button"
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen(!isOpen);
              }
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full bg-white text-ink border border-navy-200 text-left font-medium shadow-2xs transition-all duration-150 flex items-center justify-between gap-2.5 focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500 cursor-pointer select-none",
              sizeClasses,
              disabled && "opacity-50 bg-navy-50 cursor-not-allowed",
              error && "border-danger focus:ring-danger/20 focus:border-danger",
              isOpen && "border-gold-500 ring-2 ring-gold-400/30",
              triggerClassName
            )}
          >
            {/* Selected label and icon */}
            <span className="flex items-center gap-2 min-w-0 truncate">
              {SelectedIcon && (
                <SelectedIcon className="w-4 h-4 text-gold-600 shrink-0" />
              )}
              <span
                className={cn(
                  "truncate",
                  !selectedOption ? "text-mist/70 font-normal" : "text-navy-950"
                )}
              >
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            </span>

            {/* Chevron */}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-mist shrink-0 transition-transform duration-200",
                isOpen && "rotate-180 text-navy-900"
              )}
            />
          </button>

          {/* Animated Popover Listbox */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                id={listboxId}
                ref={listboxRef}
                role="listbox"
                aria-label={label || placeholder}
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white border border-navy-100 shadow-xl rounded-2xl p-1.5 max-h-60 overflow-y-auto space-y-0.5"
              >
                {options.length === 0 ? (
                  <div className="py-3 px-3 text-center text-xs text-mist">
                    No options available
                  </div>
                ) : (
                  options.map((opt, index) => {
                    const isSelected = opt.value === selectedValue;
                    const isHighlighted = highlightedIndex === index;
                    const OptIcon = opt.icon;

                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled}
                        onClick={() => {
                          if (!opt.disabled) {
                            selectValue(opt.value);
                          }
                        }}
                        onMouseEnter={() => {
                          if (!opt.disabled) {
                            setHighlightedIndex(index);
                          }
                        }}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer select-none",
                          opt.disabled && "opacity-40 cursor-not-allowed",
                          isHighlighted && !isSelected && "bg-navy-50 text-navy-950",
                          isSelected
                            ? "bg-navy-900 text-ivory font-semibold shadow-2xs"
                            : "text-navy-900 hover:bg-navy-50/70"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {OptIcon && (
                            <OptIcon
                              className={cn(
                                "w-4 h-4 shrink-0",
                                isSelected ? "text-gold-400" : "text-mist"
                              )}
                            />
                          )}
                          <div className="truncate">
                            <span>{opt.label}</span>
                            {opt.description && (
                              <p
                                className={cn(
                                  "text-[10px] line-clamp-1 mt-0.5",
                                  isSelected ? "text-ivory/80" : "text-mist"
                                )}
                              >
                                {opt.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Check Mark */}
                        {isSelected && (
                          <Check className="w-4 h-4 text-gold-400 font-bold shrink-0 ml-2" />
                        )}
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hint message */}
        {hint && !error && (
          <p className="text-xs text-mist leading-relaxed">{hint}</p>
        )}

        {/* Error message */}
        {error && (
          <p className="text-xs text-danger font-medium leading-relaxed">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
