import { describe, it, expect, beforeEach } from 'vitest';
import {
  readPreferences,
  savePreference,
  DEFAULT_DEVICE_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
} from './settings-preferences';

describe('settings-preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default preferences when storage is empty', () => {
    const prefs = readPreferences();
    expect(prefs).toEqual(DEFAULT_DEVICE_PREFERENCES);
  });

  it('save then read round-trips correctly', () => {
    savePreference('notifyQuests', false);
    savePreference('highContrastMap', true);
    savePreference('soundEnabled', false);

    const prefs = readPreferences();
    expect(prefs.notifyQuests).toBe(false);
    expect(prefs.highContrastMap).toBe(true);
    expect(prefs.soundEnabled).toBe(false);
    expect(prefs.notifyDao).toBe(DEFAULT_DEVICE_PREFERENCES.notifyDao);
    expect(prefs.notifyRewards).toBe(DEFAULT_DEVICE_PREFERENCES.notifyRewards);
  });

  it('recovers with defaults without throwing when storage contains corrupt JSON', () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, '{ corrupt-json ::: invalid');

    expect(() => {
      const prefs = readPreferences();
      expect(prefs).toEqual(DEFAULT_DEVICE_PREFERENCES);
    }).not.toThrow();

    // Saving after corruption should overwrite cleanly
    expect(() => {
      savePreference('notifyDao', false);
    }).not.toThrow();

    const updated = readPreferences();
    expect(updated.notifyDao).toBe(false);
  });

  it('recovers with defaults when storage contains non-object or non-boolean types', () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify('a primitive string'));
    expect(readPreferences()).toEqual(DEFAULT_DEVICE_PREFERENCES);

    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ notifyQuests: 'not-a-boolean', highContrastMap: 12345 })
    );
    const prefs = readPreferences();
    expect(prefs.notifyQuests).toBe(DEFAULT_DEVICE_PREFERENCES.notifyQuests);
    expect(prefs.highContrastMap).toBe(DEFAULT_DEVICE_PREFERENCES.highContrastMap);
  });
});
