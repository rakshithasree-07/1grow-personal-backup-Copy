"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Building2, MapPin, Phone, Check, ChevronRight, Sparkles } from "lucide-react";
import type { SearchTenantResult } from "@/services/onboarding";

interface SearchOrgProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearch: () => void;
  searching: boolean;
  results: SearchTenantResult[];
  selectedOrg: SearchTenantResult | null;
  onSelectOrg: (org: SearchTenantResult | null) => void;
}

export function SearchOrg({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searching,
  results,
  selectedOrg,
  onSelectOrg,
}: SearchOrgProps) {
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const onSearchRef = React.useRef(onSearch);
  onSearchRef.current = onSearch;

  const handleSearch = React.useCallback(() => {
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    onSearch();
  }, [searchQuery, onSearch]);

  const handleChange = React.useCallback(
    (value: string) => {
      onSearchQueryChange(value);
      setHighlightedIndex(-1);
      if (value.trim().length > 0) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim().length >= 2) {
        debounceRef.current = setTimeout(() => {
          setHasSearched(true);
          onSearchRef.current();
        }, 400);
      }
    },
    [onSearchQueryChange],
  );

  const handleSelect = React.useCallback(
    (org: SearchTenantResult | null) => {
      onSelectOrg(org);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onSelectOrg],
  );

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((p) => Math.min(p + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((p) => Math.max(p - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleSelect(results[highlightedIndex]!);
      } else {
        handleSearch();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const showDropdown = isOpen && (searching || results.length > 0 || (hasSearched && results.length === 0));

  return (
    <div ref={wrapperRef} className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary pointer-events-none" />
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim().length > 0) setIsOpen(true);
          }}
          placeholder="Start typing organization name..."
          className="w-full h-12 rounded-xl border-2 border-border bg-transparent pl-12 pr-10 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
        {searching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {!searching && selectedOrg && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Check size={16} className="text-primary" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full rounded-xl border border-border bg-surface shadow-lg overflow-hidden"
          >
            {/* Loading */}
            {searching && results.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-text-secondary">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Searching...
              </div>
            )}

            {/* Results */}
            {!searching && results.length > 0 && (
              <div className="max-h-[280px] overflow-y-auto">
                {results.map((org, i) => {
                  const isSelected = selectedOrg?.id === org.id;
                  const isHighlighted = i === highlightedIndex;

                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => handleSelect(org)}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-border-subtle last:border-b-0",
                        "hover:bg-surface-overlay",
                        isSelected && "bg-primary/5",
                        isHighlighted && !isSelected && "bg-surface-overlay",
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-surface-overlay text-text-secondary",
                      )}>
                        {isSelected ? <Check size={14} /> : <Building2 size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-text-primary truncate">{org.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {org.city && (
                            <span className="flex items-center gap-0.5 text-xs text-text-secondary">
                              <MapPin size={9} /> {org.city}
                            </span>
                          )}
                          {org.phone && (
                            <span className="flex items-center gap-0.5 text-xs text-text-secondary">
                              <Phone size={9} /> {org.phone}
                            </span>
                          )}
                          {org.branches.length > 0 && (
                            <span className="text-xs text-text-disabled">
                              {org.branches.length} branch{org.branches.length !== 1 ? "es" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} className={cn("shrink-0", isSelected ? "text-primary" : "text-text-disabled")} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {!searching && hasSearched && results.length === 0 && (
              <div className="py-6 text-center">
                <Building2 className="mx-auto h-8 w-8 text-text-disabled mb-2" />
                <p className="text-sm text-text-secondary">No organizations found</p>
                <p className="text-xs text-text-disabled mt-0.5">Try a different search or use the invite option below</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected org display */}
      <AnimatePresence>
        {selectedOrg && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Check size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{selectedOrg.name}</p>
              {selectedOrg.city && (
                <p className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                  <MapPin size={9} /> {selectedOrg.city}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onSearchQueryChange("");
                onSelectOrg(null as unknown as SearchTenantResult);
                inputRef.current?.focus();
              }}
              className="text-xs text-text-secondary hover:text-danger transition-colors"
            >
              Change
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial hint */}
      {!hasSearched && !searching && results.length === 0 && !selectedOrg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-border border-dashed bg-surface/30 p-3"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Sparkles size={13} className="text-primary" />
          </div>
          <p className="text-xs text-text-secondary">
            Type your organization name — suggestions appear as you type
          </p>
        </motion.div>
      )}
    </div>
  );
}
