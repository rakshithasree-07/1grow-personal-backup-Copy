"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  BookOpen,
  Package,
  IndianRupee,
  SlidersHorizontal,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Table,
  Badge,
  Pagination,
  SearchBar,
  FilterBar,
  Card,
  StatCard,
  Skeleton,
  Select as UiSelect,
} from "@/components/ui";
import {
  getRentalItems,
  getRentalCategories,
  type RentalItem,
  type RentalCategory,
  type PaginationQuery,
} from "@/services/rental";
import { cn } from "@/lib/cn";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CataloguePage() {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 10;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const query: PaginationQuery = {
        page,
        pageSize,
        search,
        status: "AVAILABLE",
        categoryId: activeFilters.categoryId,
      };
      const res = await getRentalItems(query);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters]);

  const fetchMeta = useCallback(async () => {
    try {
      const categoriesRes = await getRentalCategories();
      setCategories(categoriesRes.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const filterDefs = [
    {
      key: "categoryId", label: "Category", options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
  ];

  const columns = [
    {
      key: "name", header: "Item", render: (row: RentalItem) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
            {row.imageUrl ? (
              <img src={row.imageUrl} alt={row.name} className="h-10 w-10 rounded-[var(--radius-sm)] object-cover" />
            ) : (
              <Package size={16} className="text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-text-primary">{row.name}</p>
            {row.sku && <p className="text-xs text-text-secondary">{row.sku}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "category", header: "Category", render: (row: RentalItem) => (
        <span className="text-sm text-text-secondary">{row.category?.name ?? "-"}</span>
      ),
    },
    {
      key: "description", header: "Description", render: (row: RentalItem) => (
        <span className="text-sm text-text-secondary truncate max-w-[200px] block">
          {row.description ?? "-"}
        </span>
      ),
    },
    {
      key: "availableQty", header: "Available", render: (row: RentalItem) => (
        <span className={cn("text-sm tabular-nums font-medium", row.availableQty > 0 ? "text-success" : "text-danger")}>
          {row.availableQty} / {row.quantity}
        </span>
      ),
    },
    {
      key: "rentalPrice", header: "Price/Day", render: (row: RentalItem) => (
        <div className="text-right">
          <span className="text-sm font-medium tabular-nums text-text-primary">{formatINR(row.rentalPrice)}</span>
          {row.depositAmount > 0 && (
            <p className="text-xs text-text-secondary">Deposit: {formatINR(row.depositAmount)}</p>
          )}
        </div>
      ),
    },
    {
      key: "condition", header: "Condition", render: (row: RentalItem) => (
        <Badge
          size="sm"
          variant={
            row.condition === "NEW" || row.condition === "GOOD" ? "success" :
            row.condition === "FAIR" ? "warning" : "danger"
          }
        >
          {row.condition}
        </Badge>
      ),
    },
  ];

  return (
    <PageContainer
      title="Catalogue"
      subtitle="Browse available rental items"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
        <StatCard title="Available Items" value={items.length} icon={<BookOpen size={18} />} />
        <StatCard title="Categories" value={categories.length} icon={<Package size={18} />} />
        <StatCard title="Avg. Price" value={
          items.length > 0
            ? formatINR(Math.round(items.reduce((acc, i) => acc + i.rentalPrice, 0) / items.length))
            : formatINR(0)
        } icon={<IndianRupee size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search catalogue..."
              />
            </div>
            <Button
              variant={showFilters ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="shrink-0"
            >
              <SlidersHorizontal size={16} />
            </Button>
          </div>
          <FilterBar
            filters={filterDefs}
            active={activeFilters}
            onChange={(k, v) => { setActiveFilters((p) => ({ ...p, [k]: v })); setPage(1); }}
            onClear={() => { setActiveFilters({}); setPage(1); }}
          />
        </div>

        {/* Desktop: Table */}
        <div className="hidden sm:block">
          <Table
            columns={columns}
            data={items}
            loading={loading}
            emptyTitle="No items available"
            emptyDescription="Check back later for available rental items"
          />
          <div className="px-4 py-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>

        {/* Mobile: Cards */}
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-[var(--radius-md)]" />
            ))
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No items available</p>
              <p className="text-xs text-text-secondary mt-1">Check back later for available rental items</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-12 w-12 rounded-[var(--radius-sm)] object-cover" />
                    ) : (
                      <Package size={18} className="text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary truncate">{item.name}</p>
                    {item.sku && <p className="text-xs text-text-secondary">{item.sku}</p>}
                    {item.category && <p className="text-xs text-text-secondary">{item.category.name}</p>}
                  </div>
                </div>
                {item.description && (
                  <p className="text-xs text-text-secondary line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      size="sm"
                      variant={
                        item.condition === "NEW" || item.condition === "GOOD" ? "success" :
                        item.condition === "FAIR" ? "warning" : "danger"
                      }
                    >
                      {item.condition}
                    </Badge>
                    <span className={cn("text-xs font-medium", item.availableQty > 0 ? "text-success" : "text-danger")}>
                      {item.availableQty} available
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">{formatINR(item.rentalPrice)}<span className="text-xs font-normal text-text-secondary">/day</span></p>
                    {item.depositAmount > 0 && (
                      <p className="text-xs text-text-secondary">Deposit: {formatINR(item.depositAmount)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </PageContainer>
  );
}
