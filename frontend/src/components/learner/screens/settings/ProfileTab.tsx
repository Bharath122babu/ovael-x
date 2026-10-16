import type { AuthUser, UserProfile } from "../../../../types";

interface ProfileTabProps {
  user: AuthUser | null;
  profile?: UserProfile | null;
}

export function ProfileTab({ user, profile }: ProfileTabProps) {
  return (
    <div className="settings-section-panel">
      <div className="section-title-box">
        <span className="eyebrow blue">Learner Identity</span>
        <h2>Account Profile</h2>
        <p>Identity metadata used for institutional course enrollment and certification.</p>
      </div>

      <dl className="profile-details-grid">
        <div className="profile-item-box">
          <dt>Account Username</dt>
          <dd>{user?.username || "Authenticated User"}</dd>
        </div>
        <div className="profile-item-box">
          <dt>Platform Role</dt>
          <dd className="role-tag">{user?.role || "Learner"}</dd>
        </div>
        <div className="profile-item-box">
          <dt>Educational Institution</dt>
          <dd>{String(profile?.institution || "Not specified")}</dd>
        </div>
        <div className="profile-item-box">
          <dt>Profile Data Mode</dt>
          <dd>
            {profile?.synthetic
              ? "Synthetic demonstration data"
              : "Verified production account"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
