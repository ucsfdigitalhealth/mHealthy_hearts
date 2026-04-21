/**
 * Authenticated fetch wrapper that automatically refreshes the access token
 * on 401 TOKEN_EXPIRED responses and retries the original request once.
 *
 * Usage:
 *   const { accessToken, refreshAccessToken, logout } = useAuth();
 *   const resp = await fetchWithAuth(url, { method: 'GET' }, accessToken, refreshAccessToken, logout);
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit,
  accessToken: string | null,
  refreshAccessToken: () => Promise<boolean>,
  logout: () => Promise<void>,
): Promise<Response> {
  // Build headers with Authorization
  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status !== 401) {
    return response;
  }

  // Parse the 401 body to check if it's a token-expiry (not some other 401)
  let body: { code?: string; message?: string } = {};
  try {
    body = await response.json();
  } catch {
    // Body not JSON — treat as non-expiry 401
    return response;
  }

  const isExpired =
    body?.code === 'TOKEN_EXPIRED' ||
    body?.message?.toLowerCase().includes('expired');

  if (!isExpired) {
    // Some other 401 (bad token format, etc.) — don't refresh, just return
    return new Response(JSON.stringify(body), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('fetchWithAuth: token expired, attempting silent refresh...');
  const refreshed = await refreshAccessToken();

  if (!refreshed) {
    console.log('fetchWithAuth: refresh failed, logging out');
    await logout();
    // Return a synthetic 401 so callers handle it gracefully
    return new Response(JSON.stringify(body), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Read the freshly-written token from AsyncStorage (refreshAccessToken wrote it there)
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const newToken = await AsyncStorage.getItem('accessToken');

  console.log('fetchWithAuth: refresh succeeded, retrying request...');
  const retryHeaders = new Headers(options.headers as HeadersInit | undefined);
  if (newToken) {
    retryHeaders.set('Authorization', `Bearer ${newToken}`);
  }
  return fetch(url, { ...options, headers: retryHeaders });
}
