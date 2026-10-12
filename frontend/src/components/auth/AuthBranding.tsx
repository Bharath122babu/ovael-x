import React from 'react';
import { BrainCircuit, ShieldCheck, Cpu, Database, Eye } from 'lucide-react';

export const AuthBranding: React.FC = () => {
  return (
    <div className="auth-branding" aria-hidden="true">
      {/* Background Knowledge Graph Topology SVG */}
      <svg
        className="auth-branding__svg-mesh"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6D1F" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#E55B10" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#222222" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6D1F" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F5E7C6" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Orbit rings */}
        <circle cx="300" cy="300" r="140" stroke="url(#meshGrad)" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="300" cy="300" r="230" stroke="url(#meshGrad)" strokeWidth="1" strokeDasharray="3 8" />
        <circle cx="300" cy="300" r="280" stroke="url(#meshGrad)" strokeWidth="1" opacity="0.3" />

        {/* Knowledge Node Connections */}
        <path d="M 180 200 L 300 160 L 420 220 L 410 370 L 300 420 L 190 350 Z" stroke="url(#lineGrad)" strokeWidth="1.5" />
        <path d="M 300 160 L 300 300 L 420 220" stroke="url(#lineGrad)" strokeWidth="1.2" />
        <path d="M 300 300 L 190 350" stroke="url(#lineGrad)" strokeWidth="1.2" />
        <path d="M 300 300 L 410 370" stroke="url(#lineGrad)" strokeWidth="1.2" />
        <path d="M 180 200 L 300 300 L 300 420" stroke="url(#lineGrad)" strokeWidth="1.2" />

        {/* Nodes */}
        <circle cx="300" cy="300" r="7" fill="#FF6D1F" />
        <circle cx="300" cy="300" r="14" stroke="#FF6D1F" strokeWidth="1.5" opacity="0.4" />

        <circle cx="180" cy="200" r="4.5" fill="#F5E7C6" />
        <circle cx="300" cy="160" r="5" fill="#FF6D1F" />
        <circle cx="420" cy="220" r="4.5" fill="#FAF3E1" />
        <circle cx="410" cy="370" r="5" fill="#FF6D1F" />
        <circle cx="300" cy="420" r="4.5" fill="#F5E7C6" />
        <circle cx="190" cy="350" r="5" fill="#FAF3E1" />
      </svg>

      <div className="auth-branding__content">
        <div className="auth-branding__badge">
          <BrainCircuit size={16} />
          <span>ADAPTIVE LEARNING ENGINE • v5.0.0</span>
        </div>

        <h1 className="auth-branding__headline">
          Intelligence that knows when <em>not</em> to use AI.
        </h1>

        <p className="auth-branding__statement">
          Deterministic decision kernel. Grounded assessment. Evidence-backed progress, not just generated answers.
        </p>

        {/* Core Pillars */}
        <div className="auth-branding__pillars">
          <div className="auth-branding__pillar">
            <div className="auth-branding__pillar-icon">
              <Cpu size={18} />
            </div>
            <div>
              <strong>Deterministic kernel</strong>
              <small>Zero AI calls required for lesson moves</small>
            </div>
          </div>

          <div className="auth-branding__pillar">
            <div className="auth-branding__pillar-icon">
              <Database size={18} />
            </div>
            <div>
              <strong>Demonstrated mastery</strong>
              <small>Only verified scoring updates progress</small>
            </div>
          </div>

          <div className="auth-branding__pillar">
            <div className="auth-branding__pillar-icon">
              <ShieldCheck size={18} />
            </div>
            <div>
              <strong>Local-first security</strong>
              <small>Argon2id hashing & CSRF protection</small>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="auth-branding__stats">
          <div className="auth-branding__stat-item">
            <span className="auth-branding__stat-val">01</span>
            <span className="auth-branding__stat-label">Decision kernel</span>
          </div>
          <div className="auth-branding__stat-sep" />
          <div className="auth-branding__stat-item">
            <span className="auth-branding__stat-val">07</span>
            <span className="auth-branding__stat-label">Input modalities</span>
          </div>
          <div className="auth-branding__stat-sep" />
          <div className="auth-branding__stat-item">
            <span className="auth-branding__stat-val">100%</span>
            <span className="auth-branding__stat-label">Learner privacy</span>
          </div>
        </div>
      </div>
    </div>
  );
};
