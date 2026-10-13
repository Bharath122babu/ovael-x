/**
 * Global Feedback, Notification, Loading & Recovery Types
 */
import React from 'react';

export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
}

export interface NotificationItem {
  id: string;
  message: string;
  severity: NotificationSeverity;
  title?: string;
  action?: NotificationAction;
  duration?: number; // ms to auto-dismiss, or 0 / Infinity for persistent
  createdAt: number;
}

export interface NotificationOptions {
  message: string;
  severity?: NotificationSeverity;
  title?: string;
  action?: NotificationAction;
  duration?: number;
}

export interface NotificationContextType {
  notifications: NotificationItem[];
  notify: (optionsOrMessage: string | NotificationOptions, severity?: NotificationSeverity) => string;
  notifySuccess: (message: string, title?: string) => string;
  notifyInfo: (message: string, title?: string) => string;
  notifyWarning: (message: string, title?: string) => string;
  notifyError: (message: string, title?: string, action?: NotificationAction) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

export interface ApiErrorInfo {
  message: string;
  status?: number;
  isNetworkError: boolean;
  isRecoverable: boolean;
  rawDetails?: string;
}
