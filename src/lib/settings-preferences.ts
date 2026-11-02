export interface DevicePreferences {
  notifyQuests: boolean;
  notifyDao: boolean;
  notifyRewards: boolean;
  soundEnabled: boolean;
  highContrastMap: boolean;
}

export const PREFERENCES_STORAGE_KEY = 'juanderquest_preferences';

export const DEFAULT_DEVICE_PREFERENCES: DevicePreferences = {
  notifyQuests: true,
  notifyDao: true,
  notifyRewards: true,
  soundEnabled: true,
  highContrastMap: false,
};

export function readPreferences(): DevicePreferences {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...DEFAULT_DEVICE_PREFERENCES };
  }

  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_DEVICE_PREFERENCES };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_DEVICE_PREFERENCES };
    }

    return {
      notifyQuests:
        typeof parsed.notifyQuests === 'boolean'
          ? parsed.notifyQuests
          : DEFAULT_DEVICE_PREFERENCES.notifyQuests,
      notifyDao:
        typeof parsed.notifyDao === 'boolean'
          ? parsed.notifyDao
          : DEFAULT_DEVICE_PREFERENCES.notifyDao,
      notifyRewards:
        typeof parsed.notifyRewards === 'boolean'
          ? parsed.notifyRewards
          : DEFAULT_DEVICE_PREFERENCES.notifyRewards,
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_DEVICE_PREFERENCES.soundEnabled,
      highContrastMap:
        typeof parsed.highContrastMap === 'boolean'
          ? parsed.highContrastMap
          : DEFAULT_DEVICE_PREFERENCES.highContrastMap,
    };
  } catch {
    return { ...DEFAULT_DEVICE_PREFERENCES };
  }
}

export function savePreference<K extends keyof DevicePreferences>(
  key: K,
  value: DevicePreferences[K]
): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    let parsed: Record<string, unknown> = {};
    if (raw) {
      try {
        const json = JSON.parse(raw);
        if (json && typeof json === 'object') {
          parsed = json as Record<string, unknown>;
        }
      } catch {
        parsed = {};
      }
    }
    parsed[key] = value;
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage write failures (e.g. storage quota exceeded or disabled cookies)
  }
}
