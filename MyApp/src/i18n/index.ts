import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import am from './am.json';

const LANGUAGE_STORAGE_KEY = 'tolo_language';

export type SupportedLanguage = 'en' | 'am';

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const stored = (await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)) as SupportedLanguage | null;
      await i18n.use(initReactI18next).init({
        resources: { en: { translation: en }, am: { translation: am } },
        lng: stored ?? 'en',
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
      });
    })();
  }
  return initPromise;
}

export async function setLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export default i18n;
