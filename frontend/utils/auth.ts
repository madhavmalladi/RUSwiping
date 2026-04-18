import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { authApi, type User } from './api';
import { saveToken, deleteToken } from './storage';

// Required for the auth session redirect to close properly on native
WebBrowser.maybeCompleteAuthSession();

export { Google };

export interface AuthResult {
  user: User;
  token: string;
}

/**
 * Call this hook in your login screen to get the request/response/promptAsync
 * for Google Sign-In.
 *
 * Usage:
 *   const [request, response, promptAsync] = useGoogleAuth();
 *   useEffect(() => { handleGoogleResponse(response).then(...) }, [response]);
 */
export function useGoogleAuth() {
  return Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });
}

/**
 * Call this after a successful Google OAuth response.
 * Extracts the id_token, sends it to the backend, and saves the returned JWT.
 */
export async function handleGoogleResponse(
  response: ReturnType<typeof useGoogleAuth>[1]
): Promise<AuthResult | null> {
  if (response?.type !== 'success') return null;

  const idToken = response.params?.id_token ?? response.authentication?.idToken;

  if (!idToken) {
    throw new Error('Google sign-in did not return an id_token');
  }

  const result = await authApi.googleLogin(idToken);
  await saveToken(result.token);
  return result;
}

export async function signOut(): Promise<void> {
  await deleteToken();
}
