import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, KeyRound, GraduationCap, BookOpen } from 'lucide-react';
import { Button, Input, Field, IconButton } from '../ui';

export interface RegisterFormProps {
  onSubmit: (data: {
    username: string;
    password: string;
    role: 'learner' | 'teacher';
    teacher_invite_code?: string;
  }) => Promise<void>;
  onSwitchToSignIn: () => void;
  busy: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onSwitchToSignIn,
  busy,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'learner' | 'teacher'>('learner');
  const [teacherInviteCode, setTeacherInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
    confirmPassword?: string;
    teacherInviteCode?: string;
  }>({});

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    const trimmedUser = username.trim();

    if (!trimmedUser) {
      errors.username = 'Learner ID / Username is required';
    } else if (trimmedUser.length < 3 || trimmedUser.length > 64) {
      errors.username = 'Username must be between 3 and 64 characters';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(trimmedUser)) {
      errors.username = "Username may contain letters, numbers, '.', '_' and '-' only";
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 10) {
      errors.password = 'Password must contain at least 10 characters';
    } else if (password.length > 256) {
      errors.password = 'Password exceeds maximum length (256 characters)';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (role === 'teacher' && !teacherInviteCode.trim()) {
      errors.teacherInviteCode = 'Teacher invite code is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || busy) return;
    await onSubmit({
      username: username.trim(),
      password,
      role,
      teacher_invite_code: role === 'teacher' ? teacherInviteCode.trim() : undefined,
    });
  };

  return (
    <div className="auth-form-card">
      <div className="auth-form-card__header">
        <h1 className="auth-form-card__title">Create an account</h1>
        <p className="auth-form-card__subtitle">
          Enter your details to create an account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Role Selection */}
        <div className="auth-role-selector" role="radiogroup" aria-label="Account role">
          <button
            type="button"
            role="radio"
            aria-checked={role === 'learner'}
            className={`auth-role-option ${role === 'learner' ? 'auth-role-option--active' : ''}`}
            onClick={() => setRole('learner')}
            disabled={busy}
          >
            <BookOpen size={16} />
            <span>Learner</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={role === 'teacher'}
            className={`auth-role-option ${role === 'teacher' ? 'auth-role-option--active' : ''}`}
            onClick={() => setRole('teacher')}
            disabled={busy}
          >
            <GraduationCap size={16} />
            <span>Teacher</span>
          </button>
        </div>

        <Field
          label="Learner ID / Username"
          required
          description="Letters, numbers, '.', '_' and '-' allowed"
          error={fieldErrors.username}
          id="register-username"
        >
          <Input
            id="register-username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
            }}
            placeholder="Choose your unique username"
            leftElement={<User size={16} />}
            disabled={busy}
            hasError={Boolean(fieldErrors.username)}
          />
        </Field>

        <Field
          label="Password"
          required
          description="At least 10 characters"
          error={fieldErrors.password}
          id="register-password"
        >
          <Input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Create a strong password"
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

        <Field
          label="Confirm Password"
          required
          error={fieldErrors.confirmPassword}
          id="register-confirm-password"
        >
          <Input
            id="register-confirm-password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            placeholder="Re-enter your password"
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

        {role === 'teacher' && (
          <Field
            label="Teacher Invite Code"
            required
            description="Invite code provided by your administrator"
            error={fieldErrors.teacherInviteCode}
            id="register-teacher-code"
          >
            <Input
              id="register-teacher-code"
              name="teacherInviteCode"
              value={teacherInviteCode}
              onChange={(e) => {
                setTeacherInviteCode(e.target.value);
                if (fieldErrors.teacherInviteCode) setFieldErrors((prev) => ({ ...prev, teacherInviteCode: undefined }));
              }}
              placeholder="Enter invite code"
              leftElement={<KeyRound size={16} />}
              disabled={busy}
              hasError={Boolean(fieldErrors.teacherInviteCode)}
            />
          </Field>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          disabled={busy}
          loading={busy}
          loadingText="Creating account..."
        >
          Create workspace account
        </Button>
      </form>

      <div className="auth-form-card__footer">
        <p className="auth-switch">
          <span>Already have an account?</span>{' '}
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
