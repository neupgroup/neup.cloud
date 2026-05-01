const CACHE_KEY = 'neup:account:name';

export async function getAccountName(): Promise<string | null> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return cached;

    const res = await fetch('https://neupgroup.com/account/bridge/api.v1/getName', {
      credentials: 'include',
    });
    if (!res.ok) return null;

    const data = await res.json();
    const name = data?.name ?? data?.firstName ?? null;
    if (name) sessionStorage.setItem(CACHE_KEY, name);
    return name;
  } catch {
    return null;
  }
}
