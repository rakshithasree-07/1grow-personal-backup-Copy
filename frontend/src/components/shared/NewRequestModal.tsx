"use client";

import * as React from "react";
import { Search, Building2, MapPin, Check, ChevronRight, Send, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchOrg } from "@/components/onboarding/SearchOrg";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";
import {
  searchTenants,
  requestAccess,
  getMyAccessRequests,
  type SearchTenantResult,
  type AccessRequest,
} from "@/services/onboarding";
import { useAuthStore } from "@/store/auth.store";

interface NewRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewRequestModal({ open, onClose, onSuccess }: NewRequestModalProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<SearchTenantResult[]>([]);
  const [selectedOrg, setSelectedOrg] = React.useState<SearchTenantResult | null>(null);
  const [selectedBranch, setSelectedBranch] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [existingPending, setExistingPending] = React.useState<AccessRequest | null>(null);

  React.useEffect(() => {
    if (!open) return;
    getMyAccessRequests()
      .then((res) => {
        const pending = (res.data ?? []).find((r) => r.status === "PENDING");
        setExistingPending(pending ?? null);
      })
      .catch(() => {});
  }, [open]);

  const handleSearch = React.useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await searchTenants({ name: searchQuery });
      setResults(res.data ?? []);
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleSelectOrg = React.useCallback((org: SearchTenantResult | null) => {
    setSelectedOrg(org);
    setSelectedBranch("");
  }, []);

  const handleSubmit = async () => {
    if (!selectedOrg || !user) return;
    setSubmitting(true);
    try {
      const res = await requestAccess({
        tenantId: selectedOrg.id,
        preferredBranchId: selectedBranch || undefined,
        notes: notes || undefined,
      });

      if (res.data?.tokens) {
        localStorage.setItem("accessToken", res.data.tokens.accessToken);
        localStorage.setItem("refreshToken", res.data.tokens.refreshToken);
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "/api"}/auth/me`, {
          headers: { Authorization: `Bearer ${res.data.tokens.accessToken}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.data) setUser(meData.data);
        }
      }

      toast.success(`Request sent to ${selectedOrg.name}!`);
      resetForm();
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setResults([]);
    setSelectedOrg(null);
    setSelectedBranch("");
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Send Access Request"
      description="Search for an organization and request to join."
      size="md"
      footer={
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!selectedOrg || !!existingPending}
            leftIcon={<Send size={14} />}
          >
            {existingPending ? "Request Already Pending" : "Send Request"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {existingPending && (
          <div className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-warning/30 bg-warning/5 p-3">
            <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning">Active pending request</p>
              <p className="text-xs text-text-secondary mt-0.5">
                You already have a pending request to <span className="font-medium text-text-primary">{existingPending.tenant.name}</span>.
                Wait for it to be reviewed before sending a new one.
              </p>
            </div>
          </div>
        )}

        <SearchOrg
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
          searching={searching}
          results={results}
          selectedOrg={selectedOrg}
          onSelectOrg={handleSelectOrg}
        />

        {selectedOrg && selectedOrg.branches.length > 1 && (
          <Select
            label="Select Branch"
            value={selectedBranch}
            onChange={setSelectedBranch}
            options={[
              { value: "", label: "Choose a branch" },
              ...selectedOrg.branches.map((b) => ({
                value: b.id,
                label: `${b.name}${b.city ? ` - ${b.city}` : ""}`,
              })),
            ]}
          />
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Notes <span className="text-text-secondary font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Briefly describe why you want to join..."
            rows={3}
            className="w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
