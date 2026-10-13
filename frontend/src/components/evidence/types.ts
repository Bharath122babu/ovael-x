export interface ProofLearningSummary {
  concepts: number;
  mean_assistance_gap: number | null;
  retention_checks_due: number;
  independently_verified: number;
  transfer_verified: number;
  retained: number;
}

export interface EvidenceMass {
  acquisition: number;
  independent: number;
  transfer: number;
  retention: number;
  assisted?: number;
}

export interface ConceptProofState {
  subject_id: string;
  concept_id: string;
  concept_name?: string | null;
  acquisition: number;
  independent: number;
  transfer: number;
  retention: number;
  evidence_quality: number;
  uncertainty: number;
  assistance_gap: number | null;
  assisted_performance?: number | null;
  evidence_mass: EvidenceMass;
  last_evidence_at?: string | null;
  next_retention_check_at?: string | null;
  retention_due: boolean;
  retention_interval_days: number;
  status:
    | 'insufficient_evidence'
    | 'needs_independent_practice'
    | 'independent_verified'
    | 'transfer_verified'
    | 'retained'
    | string;
  recommended_verification:
    | 'acquisition'
    | 'independent'
    | 'transfer'
    | 'retention'
    | string;
}

export interface ProofLearningSnapshot {
  subject_id: string | null;
  generated_at: string;
  principle: string;
  states: ConceptProofState[];
  summary: ProofLearningSummary;
  scope?: string;
}

export interface LearningSessionItem {
  teaching_session_id: string;
  subject_id: string;
  course_id?: string | null;
  concept_id: string;
  goal: string;
  mode: string;
  source_client?: string;
  status: string;
  turn_count: number;
  created_at: string;
  updated_at: string;
  ended_at?: string | null;
}

export interface DecisionAuditData {
  status: 'ready' | 'no_session' | string;
  session?: {
    teaching_session_id: string;
    subject_id: string;
    course_id?: string | null;
    concept_id: string;
    goal: string;
    mode: string;
    updated_at: string;
  };
  observed?: {
    normalized_event?: Record<string, any>;
    evidence?: Record<string, any>;
  };
  remembered?: {
    turn_state?: Record<string, any>;
    procedural_memory?: any[];
    pedagogy_evidence_count?: number;
  };
  diagnosis?: {
    summary?: string | null;
    cases?: any[];
  };
  decision?: {
    decision_frame?: Record<string, any>;
    decision_trace?: Record<string, any>;
    teaching_plan?: Record<string, any>;
    output_intent?: Record<string, any>;
  };
  belief_change?: Record<string, any>;
  goal_control?: {
    goal_stack?: any[];
    last_transition?: string | null;
  };
  architecture?: {
    controller?: string;
    control_path?: string;
    ai_boundary?: string;
    input_boundary?: string;
    output_boundary?: string;
  };
}

export type EvidenceStatusFilter =
  | 'all'
  | 'verified'
  | 'practice'
  | 'due'
  | 'insufficient';
