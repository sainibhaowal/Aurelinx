import { useCallback, useEffect, useRef, useState } from "react";

const WORKSPACE_DB_NAME = "aurelinx-workspace-state";
const WORKSPACE_DB_VERSION = 2;
const FILE_STORE_NAME = "files";
const STATE_STORE_NAME = "state";
const LEGACY_INTELLIGENCE_STATE_NAMES = new Set([
  "active-subtab",
  "graph-expanded",
  "match-skills",
  "new-skill-name",
  "new-skill-level",
  "match-results",
  "active-match-employee",
  "team-budget",
  "team-size",
  "team-skills",
  "optimized-team",
  "team-search-history",
  "selected-attrition-employee",
  "attrition-search",
  "attrition-sort",
  "attrition-sort-desc",
  "selected-ona-node",
  "ona-color-mode",
  "ona-department-filter",
  "ona-search",
  "selected-career-employee",
  "career-path-result",
]);

export function getWorkspaceScope() {
  if (typeof window === "undefined") return "server";
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
    const payload = localStorage.getItem("auth_token")?.split(".")[1];
    let claims = {};
    if (payload) {
      const normalized = payload
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(payload.length / 4) * 4, "=");
      claims = JSON.parse(atob(normalized));
    }
    const tenant =
      user.tenant_id ||
      user.workspace_id ||
      claims.tenant_id ||
      claims.tid ||
      localStorage.getItem("tenant_id");
    const identity = user.id || user.user_id || user.email || claims.sub;
    if (tenant || identity)
      return `${tenant || "tenant"}:${identity || "user"}`;
  } catch {
    // Storage may be unavailable before authentication initializes.
  }
  return "anonymous";
}

export function workspaceStorageKey(name, scope = getWorkspaceScope()) {
  return `aurelinx:workspace:v1:${scope}:${name}`;
}

function readStoredValue(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return typeof fallback === "function" ? fallback() : fallback;
    }
    return JSON.parse(raw);
  } catch {
    return typeof fallback === "function" ? fallback() : fallback;
  }
}

function getLegacyIntelligenceScope() {
  try {
    const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
    const tenant =
      user.tenant_id || user.workspace_id || localStorage.getItem("tenant_id");
    const identity = user.id || user.user_id || user.email;
    if (tenant || identity)
      return `${tenant || "tenant"}:${identity || "user"}`;
    const payload = localStorage.getItem("auth_token")?.split(".")[1];
    if (payload) {
      const normalized = payload
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(payload.length / 4) * 4, "=");
      const claims = JSON.parse(atob(normalized));
      if (claims.sub || claims.tenant_id) {
        return `${claims.tenant_id || "tenant"}:${claims.sub || "user"}`;
      }
    }
  } catch {
    // Old per-tab values are optional migration input only.
  }
  return "session";
}

function readLegacyIntelligenceValue(name) {
  if (
    typeof window === "undefined" ||
    !LEGACY_INTELLIGENCE_STATE_NAMES.has(name)
  ) {
    return null;
  }
  try {
    const legacyKey = `aurelinx:intelligence-center:v1:${getLegacyIntelligenceScope()}:${name}`;
    const raw = window.sessionStorage.getItem(legacyKey);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function readStoredTimestamp(key) {
  try {
    return Number(window.localStorage.getItem(`${key}:updatedAt`) || 0);
  } catch {
    return 0;
  }
}

function writeStoredValue(key, value, updatedAt = Date.now()) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.localStorage.setItem(`${key}:updatedAt`, String(updatedAt));
    return true;
  } catch (error) {
    window.dispatchEvent(
      new CustomEvent("aurelinx:persistence-error", {
        detail: {
          key,
          message: error?.message || "Browser storage is unavailable",
        },
      }),
    );
    return false;
  }
}

export function usePersistentState(name, initialValue, scope) {
  const storageKey = workspaceStorageKey(name, scope);
  const readInitialValue = () =>
    readStoredValue(storageKey, () => {
      const legacyValue = readLegacyIntelligenceValue(name);
      if (legacyValue !== null) return legacyValue;
      return typeof initialValue === "function" ? initialValue() : initialValue;
    });
  const [value, setValue] = useState(readInitialValue);
  const valueRef = useRef(value);
  const keyRef = useRef(storageKey);
  const touchedRef = useRef(false);

  useEffect(() => {
    if (keyRef.current === storageKey) return;
    keyRef.current = storageKey;
    touchedRef.current = false;
    const nextValue = readInitialValue();
    valueRef.current = nextValue;
    setValue(nextValue);
  }, [name, storageKey]);

  useEffect(() => {
    try {
      const existing = window.localStorage.getItem(storageKey);
      const legacyValue =
        existing === null ? readLegacyIntelligenceValue(name) : null;
      if (legacyValue !== null) writeStoredValue(storageKey, legacyValue);
    } catch {
      // IndexedDB remains available when localStorage is blocked.
    }
  }, [name, storageKey]);

  useEffect(() => {
    if (!touchedRef.current) return undefined;
    const timer = window.setTimeout(() => {
      persistWorkspaceValue(storageKey, value).catch(() => {
        // localStorage remains the synchronous fallback if IndexedDB is unavailable.
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [storageKey, value]);

  useEffect(() => {
    let cancelled = false;
    openWorkspaceDatabase()
      .then(async (db) => {
        try {
          const record = await new Promise((resolve, reject) => {
            const request = db
              .transaction(STATE_STORE_NAME, "readonly")
              .objectStore(STATE_STORE_NAME)
              .get(storageKey);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
          });
          if (
            !cancelled &&
            record &&
            record.updatedAt >= readStoredTimestamp(storageKey) &&
            !touchedRef.current
          ) {
            valueRef.current = record.value;
            setValue(record.value);
            writeStoredValue(storageKey, record.value, record.updatedAt);
          }
        } finally {
          db.close();
        }
      })
      .catch(() => {
        // localStorage remains a synchronous fallback when IndexedDB is blocked.
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    const syncFromOtherTab = (event) => {
      if (event.key === storageKey && event.newValue !== null) {
        try {
          const nextValue = JSON.parse(event.newValue);
          touchedRef.current = true;
          valueRef.current = nextValue;
          setValue(nextValue);
        } catch {
          // Ignore a corrupted cross-tab update and retain the current value.
        }
      }
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => window.removeEventListener("storage", syncFromOtherTab);
  }, [storageKey]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return undefined;
    const channel = new BroadcastChannel("aurelinx-workspace-state");
    channel.onmessage = (event) => {
      if (event.data?.key !== storageKey) return;
      touchedRef.current = true;
      valueRef.current = event.data.value;
      setValue(event.data.value);
    };
    return () => channel.close();
  }, [storageKey]);

  const updateValue = useCallback(
    (nextValue) => {
      const resolved =
        typeof nextValue === "function"
          ? nextValue(valueRef.current)
          : nextValue;
      touchedRef.current = true;
      valueRef.current = resolved;
      setValue(resolved);
      const localStorageSaved = writeStoredValue(storageKey, resolved);
      if (!localStorageSaved) {
        persistWorkspaceValue(storageKey, resolved).catch(() => {});
      }
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("aurelinx-workspace-state");
        channel.postMessage({ key: storageKey, value: resolved });
        channel.close();
      }
    },
    [storageKey],
  );

  return [value, updateValue];
}

function openWorkspaceDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Persistent browser file storage is unavailable."));
      return;
    }
    const request = indexedDB.open(WORKSPACE_DB_NAME, WORKSPACE_DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FILE_STORE_NAME)) {
        request.result.createObjectStore(FILE_STORE_NAME, { keyPath: "key" });
      }
      if (!request.result.objectStoreNames.contains(STATE_STORE_NAME)) {
        request.result.createObjectStore(STATE_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function persistWorkspaceValue(key, value) {
  const db = await openWorkspaceDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STATE_STORE_NAME, "readwrite");
      transaction.objectStore(STATE_STORE_NAME).put({
        key,
        value,
        updatedAt: Date.now(),
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function saveWorkspaceFile(name, file, scope) {
  const db = await openWorkspaceDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(FILE_STORE_NAME, "readwrite");
      transaction.objectStore(FILE_STORE_NAME).put({
        key: workspaceStorageKey(name, scope),
        file,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        updatedAt: Date.now(),
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function loadWorkspaceFile(name, scope) {
  const db = await openWorkspaceDatabase();
  try {
    const record = await new Promise((resolve, reject) => {
      const request = db
        .transaction(FILE_STORE_NAME, "readonly")
        .objectStore(FILE_STORE_NAME)
        .get(workspaceStorageKey(name, scope));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    if (!record) return null;
    if (record.file instanceof File) return record.file;
    return new File([record.file], record.name, {
      type: record.type || "application/octet-stream",
      lastModified: record.lastModified || Date.now(),
    });
  } finally {
    db.close();
  }
}

export async function deleteWorkspaceFile(name, scope) {
  const db = await openWorkspaceDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(FILE_STORE_NAME, "readwrite");
      transaction
        .objectStore(FILE_STORE_NAME)
        .delete(workspaceStorageKey(name, scope));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}
