import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfileScopedKey } from '@/lib/profileStorage';

export interface MessagingSettings {
  notificationsEnabled: boolean;
  showPreviews: boolean;
  readReceipts: boolean;
  typingIndicators: boolean;
  mediaAutoDownloadWifi: boolean;
  mediaAutoDownloadCellular: boolean;
}

const DEFAULT_SETTINGS: MessagingSettings = {
  notificationsEnabled: true,
  showPreviews: true,
  readReceipts: true,
  typingIndicators: true,
  mediaAutoDownloadWifi: true,
  mediaAutoDownloadCellular: false,
};

export const useMessagingSettings = () => {
  const [settings, setSettings] = useState<MessagingSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const key = await getProfileScopedKey('messagingSettings');
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.warn('[useMessagingSettings] Failed to load settings', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<MessagingSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);

      const key = await getProfileScopedKey('messagingSettings');
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.warn('[useMessagingSettings] Failed to save settings', err);
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
  };
};
