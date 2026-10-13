import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  NotificationItem,
  NotificationOptions,
  NotificationSeverity,
  NotificationAction,
  NotificationContextType,
} from './types';
import { NotificationViewport } from './NotificationViewport';

const MAX_VISIBLE_NOTIFICATIONS = 4;
const DEDUPLICATION_WINDOW_MS = 2500;

const defaultDurations: Record<NotificationSeverity, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 9000,
};

export const NotificationContext = createContext<NotificationContextType | null>(null);

export interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const recentMapRef = useRef<Map<string, { id: string; time: number }>>(new Map());

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    recentMapRef.current.clear();
  }, []);

  const notify = useCallback(
    (optionsOrMessage: string | NotificationOptions, severity: NotificationSeverity = 'info'): string => {
      const opts: NotificationOptions =
        typeof optionsOrMessage === 'string'
          ? { message: optionsOrMessage, severity }
          : { severity, ...optionsOrMessage };

      const finalSeverity = opts.severity || 'info';
      const message = (opts.message || '').trim();
      const now = Date.now();

      // Deduplication check: prevent identical messages within window
      const dedupKey = `${finalSeverity}:${message}`;
      const existing = recentMapRef.current.get(dedupKey);

      if (existing && now - existing.time < DEDUPLICATION_WINDOW_MS) {
        // Refresh timer on existing notification rather than creating duplicate
        recentMapRef.current.set(dedupKey, { id: existing.id, time: now });
        return existing.id;
      }

      const id = `notif_${now}_${Math.random().toString(36).substring(2, 7)}`;
      recentMapRef.current.set(dedupKey, { id, time: now });

      const duration =
        opts.duration !== undefined ? opts.duration : defaultDurations[finalSeverity];

      const item: NotificationItem = {
        id,
        message,
        severity: finalSeverity,
        title: opts.title,
        action: opts.action,
        duration,
        createdAt: now,
      };

      setNotifications((prev) => {
        // Keep max visible notifications by removing oldest if at limit
        const next = [...prev, item];
        if (next.length > MAX_VISIBLE_NOTIFICATIONS) {
          return next.slice(next.length - MAX_VISIBLE_NOTIFICATIONS);
        }
        return next;
      });

      return id;
    },
    []
  );

  const notifySuccess = useCallback(
    (message: string, title?: string) => notify({ message, title, severity: 'success' }),
    [notify]
  );

  const notifyInfo = useCallback(
    (message: string, title?: string) => notify({ message, title, severity: 'info' }),
    [notify]
  );

  const notifyWarning = useCallback(
    (message: string, title?: string) => notify({ message, title, severity: 'warning' }),
    [notify]
  );

  const notifyError = useCallback(
    (message: string, title?: string, action?: NotificationAction) =>
      notify({ message, title, action, severity: 'error' }),
    [notify]
  );

  const contextValue: NotificationContextType = {
    notifications,
    notify,
    notifySuccess,
    notifyInfo,
    notifyWarning,
    notifyError,
    dismiss,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationViewport notifications={notifications} onDismiss={dismiss} />
    </NotificationContext.Provider>
  );
};

export function useNotification(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Provide a safe fallback mock if called outside provider in unit tests
    return {
      notifications: [],
      notify: () => '',
      notifySuccess: () => '',
      notifyInfo: () => '',
      notifyWarning: () => '',
      notifyError: () => '',
      dismiss: () => {},
      clearAll: () => {},
    };
  }
  return ctx;
}
