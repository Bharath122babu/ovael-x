import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Field, IconButton } from '../ui';

export interface SignInFormProps {
  onSubmit: (credentials: { username: string; password: string }) => Promise<void>;
  onSwitchToRegister: () => void;
  onSwitchToRecover: () => void;
  busy: boolean;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSubmit,
  onSwitchToRegister,
  onSwitchToRecover,
  busy,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const validate = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    const trimmedUser = username.trim();

    if (!trimmedUser) {
      errors.username = 'Username is required';
    } else if (trimmedUser.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || busy) return;
    await onSubmit({ username: username.trim(), password });
  };

  return (
    <div className="auth-form-card">
      <div className="auth-form-card__header">
        <h1 className="auth-form-card__title">Welcome back.</h1>
        <p className="auth-form-card__subtitle">
          Continue your learning journey.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <Field
          label="Learner ID / Username"
          required
          error={fieldErrors.username}
          id="signin-username"
        >
          <Input
            id="signin-username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }}
            placeholder="Enter your learner username"
            leftElement={<User size={16} />}
            disabled={busy}
            hasError={Boolean(fieldErrors.username)}
          />
        </Field>

        <Field
          label="Password"
          required
          error={fieldErrors.password}
          id="signin-password"
        >
          <Input
            id="signin-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Enter your password"
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
            hasError={Boolean(fieldErrors.password)}
          />
        </Field>

        <div className="auth-form__auxiliary">
          <button
            type="button"
            className="auth-link auth-link--subtle"
            onClick={onSwitchToRecover}
            disabled={busy}
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          disabled={busy}
          loading={busy}
          loadingText="Authenticating..."
        >
          Sign in
        </Button>
      </form>

      <div className="auth-form-card__footer">
        <p className="auth-switch">
          <span>Don't have an account?</span>{' '}
          <button
            type="button"
            className="auth-link"
            onClick={onSwitchToRegister}
            disabled={busy}
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
};
