import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

// 1. Import language files.
import en from './locales/en.json';
import ro from './locales/ro.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import cz from './locales/cz.json';
import de from './locales/de.json';
import zh from './locales/zh.json';

// 2. Initialize I18n with all translations.
const i18n = new I18n({
  en,
  ro,
  es,
  fr,
  cz,
  de,
  zh
});

// 3. Configure English fallback when a translation is missing.
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// 4. Detect the language across web and native platforms.
let deviceLanguage = 'en';

try {
  if (Platform.OS === 'web') {
    // On web (Brave/Chrome/GitHub Pages), read the language from the browser.
    // navigator.language returns values such as "ro-RO" or "en-US"; use the first part.
    deviceLanguage = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
  } else {
    // Pe Android / iOS, folosim modulul de la Expo
    const locales = getLocales();
    if (locales && locales.length > 0) {
      deviceLanguage = locales[0].languageCode;
    }
  }
} catch (e) {
  console.log('Error detecting language:', e);
}

// Set the detected language on the i18n instance.
i18n.locale = deviceLanguage;

// 5. Export the translation function.
export function t(key, opts) {
  return i18n.t(key, opts);
}

export default i18n;