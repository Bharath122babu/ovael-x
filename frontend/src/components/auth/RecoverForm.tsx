import React, { useState } from 'react';
import { User, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Field, IconButton } from '../ui';

export interface RecoverFormProps {
  onSubmit: (data: {
    username: string;
    recovery_key: string;
    new_password: string;
  }) => Promise<void>;
  onSwitchToSignIn: () => void;
  busy: boolean;
}

export const RecoverForm: React.FC<RecoverFormProps> = ({
  onSubmit,
  onSwitchToSignIn,
  busy,
}) => {
  const [username, setUsername] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    recoveryKey?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    const trimmedUser = username.trim();
    const trimmedKey = recoveryKey.trim();

    if (!trimmedUser) {
      errors.username = 'Learner ID / Username is required';
    }

    if (!trimmedKey) {
      errors.recoveryKey = 'Recovery key is required';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 10) {
      errors.newPassword = 'Password must contain at least 10 characters';
    } else if (newPassword.length > 256) {
      errors.newPassword = 'Password exceeds maximum length (256 characters)';
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || busy) return;
    await onSubmit({
      username: username.trim(),
      recovery_key: recoveryKey.trim(),
      new_password: newPassword,
    });
  };

  return (
    <div className="auth-form-card">
      <div className="auth-form-card__header">
        <h1 className="auth-form-card__title">Reset password</h1>
        <p className="auth-form-card__subtitle">
          Enter your learner ID and recovery key to set a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <Field
          label="Learner ID / Username"
          required
          error={fieldErrors.username}
          id="recover-username"
        >
          <Input
            id="recover-username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }}
            placeholder="Enter your username"
            leftElement={<User size={16} />}
            disabled={busy}
            hasError={Boolean(fieldErrors.username)}
          />
        </Field>

        <Field
          label="Recovery Key"
          required
          description="The 192-bit recovery key saved during registration"
          error={fieldErrors.recoveryKey}
          id="recover-key"
        >
          <Input
            id="recover-key"
            name="recoveryKey"
            value={recoveryKey}
            onChange={(e) => {
              setRecoveryKey(e.target.value);
              if (fieldErrors.recoveryKey) setFieldErrors((prev) => ({ ...prev, recoveryKey: undefined }));
            }}
            placeholder="Paste your recovery key"
            leftElement={<KeyRound size={16} />}
            disabled={busy}
            hasError={Boolean(fieldErrors.recoveryKey)}
          />
        </Field>

        <Field
          label="New Password"
          required
          description="At least 10 characters"
          error={fieldErrors.newPassword}
          id="recover-new-password"
        >
          <Input
            id="recover-new-password"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (fieldErrors.newPassword) setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
            }}
            placeholder="Enter new password"
            leftElement={<Lock size={16} />}
            rightElement={
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                label={showPassword ? 'Hide password' : 'Show password'}
                icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={0}
              />
            }
            disabled={busy}
            hasError={Boolean(fieldErrors.newPassword)}
          />
        </Field>

        <Field
          label="Confirm New Password"
          required
          error={fieldErrors.confirmPassword}
          id="recover-confirm-password"
        >
          <Input
            id="recover-confirm-password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            placeholder="Re-enter new password"
            leftElement={<Lock size={16} />}
            rightElement={
              <IconButton
                type="button"
                size="sm"
                variant="ghost"
                label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                icon={showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={0}
              />
            }
            disabled={busy}
            hasError={Boolean(fieldErrors.confirmPassword)}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          disabled={busy}
          loading={busy}
          loadingText="Recovering account..."
        >
          Reset password & continue
        </Button>
      </form>

      <div className="auth-form-card__footer">
        <p className="auth-switch">
          <span>Remember your password?</span>{' '}
          <button
            type="button"
            className="auth-link"
            onClick={onSwitchToSignIn}
            disabled={busy}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
