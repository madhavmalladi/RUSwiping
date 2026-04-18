import * as SecureStore from 'expo-secure-store';

const JWT_KEY = 'ruswiping_jwt';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(JWT_KEY);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY);
}
