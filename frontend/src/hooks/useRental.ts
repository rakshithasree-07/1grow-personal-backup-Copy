"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  getRentalItems,
  getRentalItemStats,
  createRentalItem,
  updateRentalItem,
  archiveRentalItem,
  restoreRentalItem,
  getRentalBookings,
  getRentalBookingStats,
  createRentalBooking,
  updateRentalBooking,
  updateBookingStatus,
  type RentalItem,
  type RentalBooking,
  type RentalStats,
  type BookingStats,
  type PaginationQuery,
  type CreateRentalBookingPayload,
} from "@/services/rental";

/* ─── Rental Item List ──────────────────────────────────────────────────────── */

export function useRentalItemList(initialParams: PaginationQuery = {}) {
  const [items, setItems] = React.useState<RentalItem[]>([]);
  const [stats, setStats] = React.useState<RentalStats | null>(null);
  const [meta, setMeta] = React.useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [params, setParams] = React.useState(initialParams);

  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRentalItems(params);
      setItems(result.data ?? []);
      setMeta(result.meta ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load rental items";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const fetchStats = React.useCallback(async () => {
    try {
      const result = await getRentalItemStats();
      setStats(result.data);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { items, stats, meta, loading, error, params, setParams, refetch: fetchItems, refetchStats: fetchStats };
}

/* ─── Single Rental Item ────────────────────────────────────────────────────── */

export function useRentalItem(id: string | null) {
  const [item, setItem] = React.useState<RentalItem | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetch = React.useCallback(async () => {
    if (!id) {
      setItem(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getRentalItems({ page: 1, pageSize: 1, search: id });
      setItem(result.data?.[0] ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load rental item";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  return { item, loading, error, refetch: fetch };
}

/* ─── Rental Item Mutations ─────────────────────────────────────────────────── */

export function useRentalItemMutations() {
  const [saving, setSaving] = React.useState(false);

  const create = async (payload: Partial<RentalItem>) => {
    setSaving(true);
    try {
      const result = await createRentalItem(payload);
      toast.success("Item created");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create item";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, payload: Partial<RentalItem>) => {
    setSaving(true);
    try {
      const result = await updateRentalItem(id, payload);
      toast.success("Item updated");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update item";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    try {
      const result = await archiveRentalItem(id);
      toast.success("Item archived");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to archive item";
      toast.error(message);
      throw err;
    }
  };

  const restore = async (id: string) => {
    try {
      const result = await restoreRentalItem(id);
      toast.success("Item restored");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to restore item";
      toast.error(message);
      throw err;
    }
  };

  return { saving, create, update, archive, restore };
}

/* ─── Rental Booking List ───────────────────────────────────────────────────── */

export function useRentalBookingList(initialParams: PaginationQuery = {}) {
  const [bookings, setBookings] = React.useState<RentalBooking[]>([]);
  const [stats, setStats] = React.useState<BookingStats | null>(null);
  const [meta, setMeta] = React.useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [params, setParams] = React.useState(initialParams);

  const fetchBookings = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRentalBookings(params);
      setBookings(result.data ?? []);
      setMeta(result.meta ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load bookings";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const fetchStats = React.useCallback(async () => {
    try {
      const result = await getRentalBookingStats();
      setStats(result.data);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { bookings, stats, meta, loading, error, params, setParams, refetch: fetchBookings, refetchStats: fetchStats };
}

/* ─── Rental Booking Mutations ──────────────────────────────────────────────── */

export function useRentalBookingMutations() {
  const [saving, setSaving] = React.useState(false);

  const create = async (payload: CreateRentalBookingPayload) => {
    setSaving(true);
    try {
      const result = await createRentalBooking(payload);
      toast.success("Booking created");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create booking";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, payload: Partial<RentalBooking>) => {
    setSaving(true);
    try {
      const result = await updateRentalBooking(id, payload);
      toast.success("Booking updated");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update booking";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string, notes?: string) => {
    setSaving(true);
    try {
      const result = await updateBookingStatus(id, { status, notes });
      toast.success(`Booking ${status.toLowerCase()}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { saving, create, update, updateStatus };
}
