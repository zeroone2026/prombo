import { useState, useEffect } from 'react';
import { ContentMediaSettings } from '../types';
import { StorageService, DEFAULT_CONTENT_MEDIA_SETTINGS } from '../services/storage';

/**
 * Custom React hook that subscribes to real-time changes in Content & Media Settings.
 * Automatically triggers re-renders when the Admin panel toggles media features or updates limits.
 */
export function useContentMediaSettings(): ContentMediaSettings {
  const [settings, setSettings] = useState<ContentMediaSettings>(() => {
    return StorageService.getContentMediaSettings() || DEFAULT_CONTENT_MEDIA_SETTINGS;
  });

  useEffect(() => {
    const handleSettingsChanged = (e: CustomEvent<ContentMediaSettings>) => {
      if (e.detail) {
        setSettings(e.detail);
      } else {
        setSettings(StorageService.getContentMediaSettings() || DEFAULT_CONTENT_MEDIA_SETTINGS);
      }
    };

    window.addEventListener('prombo_content_media_settings_changed' as any, handleSettingsChanged as EventListener);
    
    return () => {
      window.removeEventListener('prombo_content_media_settings_changed' as any, handleSettingsChanged as EventListener);
    };
  }, []);

  return settings;
}
