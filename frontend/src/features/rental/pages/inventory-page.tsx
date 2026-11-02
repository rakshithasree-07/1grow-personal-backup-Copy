"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Package,
  Edit3,
  Archive,
  RotateCcw,
  MoreHorizontal,
  IndianRupee,
  Hash,
  AlertTriangle,
  CheckCircle,
  Wrench,
  XCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Table,
  Badge,
  Pagination,
  SearchBar,
  FilterBar,
  Modal,
  ConfirmModal,
  Card,
  StatCard,
  Skeleton,
  Input,
  Select as UiSelect,
} from "@/components/ui";
import {
  getRentalItems,
  getRentalItemStats,
  getRentalCategories,
  createRentalItem,
  updateRentalItem,
  archiveRentalItem,
  restoreRentalItem,
  createRentalCategory,
  updateRentalCategory,
  deleteRentalCategory,
  type RentalItem,
  type RentalCategory,
  type RentalStats,
  type PaginationQuery,
} from "@/services/rental";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { uploadToStorage } from "@/services/upload";
import { Image as ImageIcon, FolderPlus, Trash2 } from "lucide-react";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "outline"> = {
  AVAILABLE: "success",
  RENTED: "info",
  MAINTENANCE: "warning",
  DAMAGED: "danger",
  RETIRED: "outline",
};

const conditionVariant: Record<string, "success" | "warning" | "danger" | "info"> = {
  NEW: "success",
  GOOD: "success",
  FAIR: "warning",
  POOR: "danger",
  DAMAGED: "danger",
};

function RowMenu({
  row,
  onEdit,
  onRestore,
  onArchive,
}: {
  row: RentalItem;
  onEdit: () => void;
  onRestore: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useState(() => ({ current: null as HTMLDivElement | null }))[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, ref]);

  return (
    <div className="flex items-center justify-end gap-1" ref={(el) => { ref.current = el; }}>
      {open && (
        <>
          <Button size="xs" variant="ghost" title="Edit" onClick={() => { setOpen(false); onEdit(); }}>
            <Edit3 size={14} />
          </Button>
          {row.isArchived ? (
            <Button size="xs" variant="ghost" title="Restore" onClick={() => { setOpen(false); onRestore(); }}>
              <RotateCcw size={14} />
            </Button>
          ) : (
            <Button size="xs" variant="ghost" title="Archive" onClick={() => { setOpen(false); onArchive(); }}>
              <Archive size={14} />
            </Button>
          )}
        </>
      )}
      <Button size="xs" variant="ghost" title="More actions" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
        <MoreHorizontal size={16} />
      </Button>
    </div>
  );
}

export function InventoryPage() {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [stats, setStats] = useState<RentalStats | null>(null);
  const [categories, setCategories] = useState<RentalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<RentalItem | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<RentalItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    sku: "",
    quantity: "",
    rentalPrice: "",
    depositAmount: "",
    condition: "GOOD",
    status: "AVAILABLE",
    imageUrl: "",
  });
  const [imageUploading, setImageUploading] = useState(false);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RentalCategory | null>(null);
  const [catDeleteConfirm, setCatDeleteConfirm] = useState<RentalCategory | null>(null);
  const [catSubmitting, setCatSubmitting] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "" });

  const pageSize = 10;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const query: PaginationQuery = {
        page,
        pageSize,
        search,
        status: activeFilters.status,
        categoryId: activeFilters.categoryId,
        condition: activeFilters.condition,
        sortBy: sortKey || undefined,
        sortDir: sortDir || undefined,
      };
      const res = await getRentalItems(query);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilters, sortKey, sortDir]);

  const fetchMeta = useCallback(async () => {
    try {
      const [statsRes, categoriesRes] = await Promise.all([
        getRentalItemStats(),
        getRentalCategories(),
      ]);
      setStats(statsRes.data);
      setCategories(categoriesRes.data ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      categoryId: "",
      sku: "",
      quantity: "",
      rentalPrice: "",
      depositAmount: "",
      condition: "GOOD",
      status: "AVAILABLE",
      imageUrl: "",
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setImageUploading(true);
    try {
      const result = await uploadToStorage(file, "rental", "items");
      setForm((p) => ({ ...p, imageUrl: result.url }));
      toast.success("Image uploaded");
    } catch { toast.error("Failed to upload image"); }
    finally { setImageUploading(false); }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item: RentalItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      categoryId: item.categoryId ?? "",
      sku: item.sku ?? "",
      quantity: String(item.quantity),
      rentalPrice: String(item.rentalPrice),
      depositAmount: String(item.depositAmount),
      condition: item.condition,
      status: item.status,
      imageUrl: item.imageUrl ?? "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!form.rentalPrice || Number(form.rentalPrice) <= 0) {
      toast.error("Rental price must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        categoryId: form.categoryId || null,
        sku: form.sku.trim() || null,
        quantity: Number(form.quantity) || 1,
        rentalPrice: Number(form.rentalPrice),
        depositAmount: Number(form.depositAmount) || 0,
        condition: form.condition,
        status: form.status,
        imageUrl: form.imageUrl || null,
      };

      if (editingItem) {
        await updateRentalItem(editingItem.id, payload);
        toast.success("Item updated successfully");
      } else {
        await createRentalItem(payload);
        toast.success("Item created successfully");
      }
      setModalOpen(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
      fetchMeta();
    } catch {
      toast.error(editingItem ? "Failed to update item" : "Failed to create item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (item: RentalItem) => {
    try {
      await archiveRentalItem(item.id);
      toast.success("Item archived");
      setArchiveConfirm(null);
      fetchItems();
      fetchMeta();
    } catch {
      toast.error("Failed to archive item");
    }
  };

  const handleRestore = async (item: RentalItem) => {
    try {
      await restoreRentalItem(item.id);
      toast.success("Item restored");
      setRestoreConfirm(null);
      fetchItems();
      fetchMeta();
    } catch {
      toast.error("Failed to restore item");
    }
  };

  const openCategoryModal = () => {
    setEditingCategory(null);
    setCatForm({ name: "", description: "" });
    setCatModalOpen(true);
  };

  const openEditCategoryModal = (cat: RentalCategory) => {
    setEditingCategory(cat);
    setCatForm({ name: cat.name, description: cat.description ?? "" });
    setCatModalOpen(true);
  };

  const handleCategorySubmit = async () => {
    if (!catForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setCatSubmitting(true);
    try {
      if (editingCategory) {
        await updateRentalCategory(editingCategory.id, {
          name: catForm.name.trim(),
          description: catForm.description.trim() || null,
        });
        toast.success("Category updated successfully");
      } else {
        await createRentalCategory({
          name: catForm.name.trim(),
          description: catForm.description.trim() || null,
        });
        toast.success("Category created successfully");
      }
      setCatModalOpen(false);
      setEditingCategory(null);
      fetchMeta();
    } catch {
      toast.error(editingCategory ? "Failed to update category" : "Failed to create category");
    } finally {
      setCatSubmitting(false);
    }
  };

  const handleCategoryDelete = async (cat: RentalCategory) => {
    try {
      await deleteRentalCategory(cat.id);
      toast.success("Category deleted");
      setCatDeleteConfirm(null);
      fetchMeta();
    } catch {
      toast.error("Failed to delete category. Remove or reassign its items first.");
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filterDefs = [
    {
      key: "status", label: "Status", options: [
        { value: "AVAILABLE", label: "Available" },
        { value: "RENTED", label: "Rented" },
        { value: "MAINTENANCE", label: "Maintenance" },
        { value: "DAMAGED", label: "Damaged" },
        { value: "RETIRED", label: "Retired" },
      ],
    },
    {
      key: "categoryId", label: "Category", options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: "condition", label: "Condition", options: [
        { value: "NEW", label: "New" },
        { value: "GOOD", label: "Good" },
        { value: "FAIR", label: "Fair" },
        { value: "POOR", label: "Poor" },
        { value: "DAMAGED", label: "Damaged" },
      ],
    },
  ];

  const columns = [
    {
      key: "name", header: "Name", sortable: true, render: (row: RentalItem) => (
        <div className="flex items-center gap-3">
          {row.imageUrl ? (
            <img src={row.imageUrl} alt={row.name} className="h-8 w-8 rounded-[var(--radius-sm)] object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10">
              <Package size={14} className="text-primary" />
            </div>
          )}
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
      key: "quantity", header: "Qty", sortable: true, render: (row: RentalItem) => (
        <span className="text-sm tabular-nums text-text-primary">{row.quantity}</span>
      ),
    },
    {
      key: "availableQty", header: "Available", sortable: true, render: (row: RentalItem) => (
        <span className={cn("text-sm tabular-nums font-medium", row.availableQty > 0 ? "text-success" : "text-danger")}>
          {row.availableQty}
        </span>
      ),
    },
    {
      key: "rentalPrice", header: "Price", sortable: true, render: (row: RentalItem) => (
        <span className="text-sm tabular-nums text-text-primary">{formatINR(row.rentalPrice)}</span>
      ),
    },
    {
      key: "condition", header: "Condition", render: (row: RentalItem) => (
        <Badge size="sm" variant={conditionVariant[row.condition] ?? "outline"}>
          {row.condition}
        </Badge>
      ),
    },
    {
      key: "status", header: "Status", sortable: true, render: (row: RentalItem) => (
        <Badge size="sm" variant={statusVariant[row.status] ?? "outline"}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "", className: "w-24", render: (row: RentalItem) => (
        <RowMenu
          row={row}
          onEdit={() => openEditModal(row)}
          onRestore={() => setRestoreConfirm(row)}
          onArchive={() => setArchiveConfirm(row)}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="Rental Inventory"
      subtitle="Manage rental items and stock"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openCategoryModal}>
            <FolderPlus size={16} /> Categories
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus size={16} /> Add Item
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        <StatCard title="Total Items" value={stats?.total ?? items.length} icon={<Package size={18} />} />
        <StatCard title="Available" value={stats?.available ?? 0} icon={<CheckCircle size={18} />} />
        <StatCard title="Rented" value={stats?.rented ?? 0} icon={<Hash size={18} />} />
        <StatCard title="Maintenance" value={stats?.maintenance ?? 0} icon={<Wrench size={18} />} />
        <StatCard title="Damaged" value={stats?.damaged ?? 0} icon={<AlertTriangle size={18} />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-0">
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search items..."
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
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            emptyTitle="No items found"
            emptyDescription="Add your first rental item to get started"
          />
          <div className="px-4 py-3">
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </div>
        </div>

        {/* Mobile: Cards */}
        <div className="sm:hidden space-y-3 p-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-[var(--radius-md)]" />
            ))
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-text-secondary">No items found</p>
              <p className="text-xs text-text-secondary mt-1">Add your first rental item to get started</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="w-full text-left rounded-[var(--radius-md)] border border-border p-4 space-y-3 hover:bg-surface-overlay transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-8 w-8 rounded-[var(--radius-sm)] object-cover shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-primary/10 shrink-0">
                        <Package size={14} className="text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary truncate">{item.name}</p>
                      {item.sku && <p className="text-xs text-text-secondary truncate">{item.sku}</p>}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowMenu
                      row={item}
                      onEdit={() => openEditModal(item)}
                      onRestore={() => setRestoreConfirm(item)}
                      onArchive={() => setArchiveConfirm(item)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {item.category && <span className="text-text-secondary">{item.category.name}</span>}
                  <Badge size="sm" variant={statusVariant[item.status] ?? "outline"}>{item.status}</Badge>
                  <Badge size="sm" variant={conditionVariant[item.condition] ?? "outline"}>{item.condition}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    Qty: {item.availableQty}/{item.quantity}
                  </span>
                  <span className="font-medium text-text-primary">{formatINR(item.rentalPrice)}/day</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingItem(null); resetForm(); }}
        title={editingItem ? "Edit Item" : "Add Rental Item"}
        size="md"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Item Image</label>
            <div className="flex items-center gap-3">
              {form.imageUrl ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                  <img src={form.imageUrl} alt="Item" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-danger text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                  {imageUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                  ) : (
                    <ImageIcon size={20} className="text-text-secondary" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={imageUploading} />
                </label>
              )}
              <span className="text-xs text-text-secondary">Optional. Max 5MB. JPG, PNG.</span>
            </div>
          </div>

          <Input
            label="Item Name"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Enter item name"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Optional description"
          />
          <UiSelect
            label="Category"
            value={form.categoryId}
            onChange={(val) => setForm((p) => ({ ...p, categoryId: val }))}
            placeholder="Select category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            hint={categories.length === 0 ? "No categories yet. Use the Categories button to add one." : undefined}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="Optional SKU"
            />
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
              placeholder="1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rental Price (INR/day)"
              type="number"
              min="0"
              required
              value={form.rentalPrice}
              onChange={(e) => setForm((p) => ({ ...p, rentalPrice: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Deposit Amount (INR)"
              type="number"
              min="0"
              value={form.depositAmount}
              onChange={(e) => setForm((p) => ({ ...p, depositAmount: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <UiSelect
              label="Condition"
              value={form.condition}
              onChange={(val) => setForm((p) => ({ ...p, condition: val }))}
              options={[
                { value: "NEW", label: "New" },
                { value: "GOOD", label: "Good" },
                { value: "FAIR", label: "Fair" },
                { value: "POOR", label: "Poor" },
                { value: "DAMAGED", label: "Damaged" },
              ]}
            />
            <UiSelect
              label="Status"
              value={form.status}
              onChange={(val) => setForm((p) => ({ ...p, status: val }))}
              options={[
                { value: "AVAILABLE", label: "Available" },
                { value: "RENTED", label: "Rented" },
                { value: "MAINTENANCE", label: "Maintenance" },
                { value: "DAMAGED", label: "Damaged" },
                { value: "RETIRED", label: "Retired" },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditingItem(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingItem ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal
        open={catModalOpen}
        onClose={() => { setCatModalOpen(false); setEditingCategory(null); }}
        title="Manage Categories"
        description="Categories help organize your rental inventory"
        size="md"
        className="sm:max-h-[85vh] max-h-[95vh] sm:m-4 m-0 sm:rounded-[var(--radius-lg)] rounded-none sm:items-center items-end"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-3">
              <Input
                label={editingCategory ? "Edit Category" : "New Category"}
                required
                value={catForm.name}
                onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Category name"
              />
              <Input
                label="Description"
                value={catForm.description}
                onChange={(e) => setCatForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <Button
              onClick={handleCategorySubmit}
              loading={catSubmitting}
              disabled={!catForm.name.trim()}
            >
              {editingCategory ? "Update" : "Add Category"}
            </Button>
          </div>

          <div className="border-t border-border-subtle pt-4">
            {categories.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-6">
                No categories yet. Add your first category above.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{cat.name}</p>
                      <p className="text-xs text-text-secondary truncate">
                        {cat.description ?? "No description"}
                        {cat._count?.items !== undefined && ` · ${cat._count.items} item(s)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="xs" variant="ghost" title="Edit" onClick={() => openEditCategoryModal(cat)}>
                        <Edit3 size={14} />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        title="Delete"
                        onClick={() => setCatDeleteConfirm(cat)}
                        disabled={!!cat._count?.items}
                      >
                        <Trash2 size={14} className="text-danger" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Archive Confirm */}
      <ConfirmModal
        open={!!archiveConfirm}
        onClose={() => setArchiveConfirm(null)}
        onConfirm={async () => {
          if (archiveConfirm) await handleArchive(archiveConfirm);
        }}
        title="Archive Item"
        description={`Are you sure you want to archive "${archiveConfirm?.name}"?`}
        confirmLabel="Archive"
        intent="warning"
      />

      {/* Restore Confirm */}
      <ConfirmModal
        open={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        onConfirm={async () => {
          if (restoreConfirm) await handleRestore(restoreConfirm);
        }}
        title="Restore Item"
        description={`Restore "${restoreConfirm?.name}"?`}
        confirmLabel="Restore"
        intent="info"
      />

      {/* Delete Category Confirm */}
      <ConfirmModal
        open={!!catDeleteConfirm}
        onClose={() => setCatDeleteConfirm(null)}
        onConfirm={async () => {
          if (catDeleteConfirm) await handleCategoryDelete(catDeleteConfirm);
        }}
        title="Delete Category"
        description={`Are you sure you want to delete "${catDeleteConfirm?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        intent="danger"
      />

      {/* Mobile FAB */}
      <div className="fixed bottom-20 right-4 z-40 sm:hidden">
        <button
          onClick={openCreateModal}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>
    </PageContainer>
  );
}
