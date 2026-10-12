import React from 'react';
import { NotificationItem } from './types';
import { NotificationToast } from './NotificationToast';

export interface NotificationViewportProps {
  notifications: NotificationItem[];
  onDismiss: (id: string) => void;
}

export const NotificationViewport: React.FC<NotificationViewportProps> = ({
  notifications,
  onDismiss,
}) => {
  if (notifications.length === 0) return null;

  return (
    <div
      className="notification-viewport"
      role="region"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
