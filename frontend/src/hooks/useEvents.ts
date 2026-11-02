"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  getEvents,
  getEvent,
  getEventStats,
  createEvent,
  updateEvent,
  updateEventStatus,
  type Event,
  type EventListParams,
  type EventStats,
} from "@/services/events";

export function useEventList(initialParams: EventListParams = {}) {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [meta, setMeta] = React.useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [params, setParams] = React.useState(initialParams);

  const fetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEvents(params);
      setEvents(result.data ?? []);
      setMeta(result.meta ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load events";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  return { events, meta, loading, error, params, setParams, refetch: fetch };
}

export function useEvent(id: string | null) {
  const [event, setEvent] = React.useState<Event | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetch = React.useCallback(async () => {
    if (!id) {
      setEvent(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getEvent(id);
      setEvent(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load event";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  return { event, loading, error, refetch: fetch };
}

export function useEventMutations() {
  const [saving, setSaving] = React.useState(false);

  const create = async (payload: Partial<Event>) => {
    setSaving(true);
    try {
      const result = await createEvent(payload);
      toast.success("Event created");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create event";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const update = async (id: string, payload: Partial<Event>) => {
    setSaving(true);
    try {
      const result = await updateEvent(id, payload);
      toast.success("Event updated");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update event";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    setSaving(true);
    try {
      const result = await updateEventStatus(id, status);
      toast.success(`Event status changed to ${status}`);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: string) => {
    setSaving(true);
    try {
      await updateEvent(id, { isArchived: true } as Partial<Event>);
      toast.success("Event archived");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to archive event";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const restore = async (id: string) => {
    setSaving(true);
    try {
      await updateEvent(id, { isArchived: false } as Partial<Event>);
      toast.success("Event restored");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to restore event";
      toast.error(message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { saving, create, update, changeStatus, archive, restore };
}
