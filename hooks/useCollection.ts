"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listCollection,
  createItem,
  updateItem,
  deleteItem,
  replaceCollection,
} from "@/lib/api";

export type WithId = { id: string };

// useCollection<T>("leads") loads a collection from the local JSON database and
// returns helpers that keep React state and the server file in sync.
//
// Mutations update local state optimistically (so the UI feels instant) and
// persist to disk in the background. create() awaits the server so the row gets
// its real, server-assigned id.
export function useCollection<T extends WithId>(collection: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await listCollection<T>(collection);
      setItems(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => {
    let active = true;
    // `loading` starts true via useState, so no synchronous setState needed here.
    listCollection<T>(collection)
      .then((data) => active && setItems(data))
      .catch((err) => active && setError(err as Error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [collection]);

  // Create a row; returns the persisted row (with its real id).
  const create = useCallback(
    async (data: Partial<T>): Promise<T> => {
      const created = await createItem<T>(collection, data);
      setItems((prev) => [...prev, created]);
      return created;
    },
    [collection],
  );

  // Like create() but inserts at the top of the list (e.g. activity feeds).
  const createFirst = useCallback(
    async (data: Partial<T>): Promise<T> => {
      const created = await createItem<T>(collection, data);
      setItems((prev) => [created, ...prev]);
      return created;
    },
    [collection],
  );

  const update = useCallback(
    async (id: string, patch: Partial<T>): Promise<void> => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      try {
        await updateItem<T>(collection, id, patch);
      } catch (err) {
        setError(err as Error);
        refresh();
      }
    },
    [collection, refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      try {
        await deleteItem(collection, id);
      } catch (err) {
        setError(err as Error);
        refresh();
      }
    },
    [collection, refresh],
  );

  const replace = useCallback(
    async (rows: T[]): Promise<void> => {
      setItems(rows);
      try {
        await replaceCollection<T>(collection, rows);
      } catch (err) {
        setError(err as Error);
        refresh();
      }
    },
    [collection, refresh],
  );

  return { items, setItems, loading, error, refresh, create, createFirst, update, remove, replace };
}
