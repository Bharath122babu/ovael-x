import React from 'react';
import { User, Shield, School, KeyRound, Key, Calendar } from 'lucide-react';
import { Card, Badge, Button } from '../ui';
import { UserProfile } from './types';

export interface AccountProfileCardProps {
  profile: UserProfile | null;
  onChangePassword: () => void;
  onRotateRecoveryKey: () => void;
}

export const AccountProfileCard: React.FC<AccountProfileCardProps> = ({
  profile,
  onChangePassword,
  onRotateRecoveryKey,
}) => {
  if (!profile) return null;

  const initial = (profile.display_name || profile.username || 'U')[0].toUpperCase();
  const updatedDate = profile.updated_at
    ? new Date(profile.updated_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Card className="settings-card account-profile-card">
      <div className="account-profile-card__header">
        <div className="account-profile-card__avatar" aria-hidden="true">
          <span>{initial}</span>
        </div>
        <div className="account-profile-card__identity">
          <div className="account-profile-card__title-line">
            <h3 className="account-profile-card__name">
              {profile.display_name || profile.username}
            </h3>
            <Badge variant="primary" size="sm">
              {profile.role === 'teacher' ? 'Teacher / Educator' : 'Learner'}
            </Badge>
            {profile.synthetic && (
              <Badge variant="neutral" size="sm">
                Synthetic Benchmark
              </Badge>
            )}
          </div>
          <span className="account-profile-card__username">
            @{profile.username} · User ID: <code>{profile.user_id}</code>
          </span>
        </div>
      </div>

      <div className="account-profile-card__details">
        <div className="profile-detail-item">
          <span className="profile-detail-label">Institution / Workspace:</span>
          <span className="profile-detail-value">
            {profile.institution || 'Personal Learning Space'}
          </span>
        </div>
        {updatedDate && (
          <div className="profile-detail-item">
            <span className="profile-detail-label">Last Profile Update:</span>
            <span className="profile-detail-value">{updatedDate}</span>
          </div>
        )}
        <div className="profile-detail-item">
          <span className="profile-detail-label">Authentication Status:</span>
          <span className="profile-detail-value profile-detail-value--verified">
            <Shield size={14} aria-hidden="true" />
            Same-origin encrypted cookie session
          </span>
        </div>
      </div>

      <div className="account-profile-card__footer">
        <div className="account-profile-card__actions">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onChangePassword}
            leftIcon={<KeyRound size={15} />}
          >
            Change Password
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRotateRecoveryKey}
            leftIcon={<Key size={15} />}
          >
            Rotate Recovery Key
          </Button>
        </div>
        <p className="account-profile-card__note">
          Profile identity projections are synchronized with the authentication authority.
        </p>
      </div>
    </Card>
  );
};
