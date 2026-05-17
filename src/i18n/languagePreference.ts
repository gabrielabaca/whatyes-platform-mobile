import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pulpolive/language';

export type AppLanguage = 'es' | 'en';

export const SUPPORTED_LANGUAGES: AppLanguage[] = ['es', 'en'];

export async function getStoredLanguage(): Promise<AppLanguage> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  return saved === 'en' ? 'en' : 'es';
}

export async function persistLanguage(lng: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, lng);
}
