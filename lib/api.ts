// Thin client for the local JSON database exposed under /api/*.
// Used by the useCollection hook and AppDataContext.

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<T>;
}

export async function listCollection<T>(collection: string): Promise<T[]> {
  return handle<T[]>(await fetch(`/api/${collection}`, { cache: "no-store" }));
}

export async function createItem<T>(collection: string, data: Partial<T>): Promise<T> {
  return handle<T>(
    await fetch(`/api/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export async function updateItem<T>(
  collection: string,
  id: string,
  patch: Partial<T>,
): Promise<T> {
  return handle<T>(
    await fetch(`/api/${collection}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteItem(collection: string, id: string): Promise<void> {
  await handle<{ ok: boolean }>(
    await fetch(`/api/${collection}/${id}`, { method: "DELETE" }),
  );
}

export async function replaceCollection<T>(collection: string, rows: T[]): Promise<T[]> {
  return handle<T[]>(
    await fetch(`/api/${collection}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows),
    }),
  );
}

export async function resetDatabase(): Promise<void> {
  await handle<{ ok: boolean }>(await fetch(`/api/reset`, { method: "POST" }));
}
