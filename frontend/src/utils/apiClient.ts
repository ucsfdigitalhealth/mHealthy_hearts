/**
 * Authenticated fetch wrapper that automatically refreshes the access token
 * on 401 responses and retries the original request once.
 *
 * Usage:
 *   const { accessToken, refreshAccessToken, logout } = useAuth();
 *   const data = await fetchWithAuth(url, { method: 'GET' }, accessToken, refreshAccessToken, logout);
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit,
  accessToken: string | null,
  refreshAccessToken: () => Promise<boolean>,
  logout: () => Promise<void>
): Promise<Response> {
  const headers = new Headers(options.headers as HeadersInit);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(url, { ...options, headers });

  // If we get a 401, try to refresh and retry once
  if (response.status === 401) {
    const body = await response.json().catch(() => ({}));
    const isExpired =
      body?.code === 'TOKEN_EXPIRED' ||
      body?.message?.toLowerCase().includes('expired');

    if (isExpired) {
      console.log('fetchWithAuth: access token expired, attempting refresh...');
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // refreshAccessToken updated the token in AsyncStorage and state —
        // but we don't have the new token here yet. Re-read from the response
        // of refreshAccessToken is not straightforward, so we use a small
        // workaround: import AsyncStorage to read the updated token.
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const newToken = await AsyncStorage.getItem('accessToken');

        const retryHeaders = new Headers(options.headers as HeadersInit);
        if (newToken) {
          retryHeaders.set('Authorization', `Bearer ${newToken}`);
        }
        return fetch(url, { ...options, headers: retryHeaders });
      } else {
        // Refresh failed — log out
        await logout();
      }
    }
  }

  return response;
}
