import React, { useMemo, useState } from 'react';
import { Search, ArrowUpDown, Filter, Layers } from 'lucide-react';
import { Button, Input, EmptyState } from '../ui';
import { ConceptEvidenceRow } from './ConceptEvidenceRow';
import { ConceptProofState, EvidenceStatusFilter } from './types';

export interface ConceptEvidenceTableProps {
  states: ConceptProofState[];
  onStudyConcept?: (conceptId: string) => void;
}

export const ConceptEvidenceTable: React.FC<ConceptEvidenceTableProps> = ({
  states,
  onStudyConcept,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EvidenceStatusFilter>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'gap'>('recent');

  // Filter counts
  const verifiedCount = useMemo(
    () =>
      states.filter(
        (s) =>
          s.status === 'independent_verified' ||
          s.status === 'transfer_verified' ||
          s.status === 'retained'
      ).length,
    [states]
  );

  const practiceCount = useMemo(
    () => states.filter((s) => s.status === 'needs_independent_practice').length,
    [states]
  );

  const dueCount = useMemo(
    () => states.filter((s) => s.retention_due).length,
    [states]
  );

  const insufficientCount = useMemo(
    () => states.filter((s) => s.status === 'insufficient_evidence').length,
    [states]
  );

  // Filtered & sorted states
  const filteredStates = useMemo(() => {
    return states
      .filter((s) => {
        // Status filter
        if (statusFilter === 'verified') {
          if (
            s.status !== 'independent_verified' &&
            s.status !== 'transfer_verified' &&
            s.status !== 'retained'
          )
            return false;
        } else if (statusFilter === 'practice') {
          if (s.status !== 'needs_independent_practice') return false;
        } else if (statusFilter === 'due') {
          if (!s.retention_due) return false;
        } else if (statusFilter === 'insufficient') {
          if (s.status !== 'insufficient_evidence') return false;
        }

        // Search query
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;

        const nameMatch = (s.concept_name || '').toLowerCase().includes(q);
        const idMatch = s.concept_id.toLowerCase().includes(q);
        const subjMatch = s.subject_id.toLowerCase().includes(q);
        return Boolean(nameMatch || idMatch || subjMatch);
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          const nameA = a.concept_name || a.concept_id;
          const nameB = b.concept_name || b.concept_id;
          return nameA.localeCompare(nameB);
        }
        if (sortBy === 'gap') {
          const gapA = a.assistance_gap ?? -999;
          const gapB = b.assistance_gap ?? -999;
          return gapB - gapA;
        }
        // Default: recent
        const dateA = a.last_evidence_at || '';
        const dateB = b.last_evidence_at || '';
        return dateB.localeCompare(dateA);
      });
  }, [states, statusFilter, searchQuery, sortBy]);

  return (
    <section className="concept-evidence-table" aria-label="Topic evidence table">
      {/* Toolbar */}
      <div className="concept-evidence-table__toolbar">
        <div className="concept-evidence-table__search">
          <Search size={15} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics by name, ID, or subject..."
            className="concept-evidence-table__search-input"
            aria-label="Filter learning evidence topics"
          />
        </div>

        <div
          className="concept-evidence-table__filters"
          role="group"
          aria-label="Filter evidence by verified status"
        >
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            aria-pressed={statusFilter === 'all'}
          >
            All ({states.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'verified' ? 'active' : ''}`}
            onClick={() => setStatusFilter('verified')}
            aria-pressed={statusFilter === 'verified'}
          >
            Verified ({verifiedCount})
          </button>
          {practiceCount > 0 && (
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'practice' ? 'active' : ''}`}
              onClick={() => setStatusFilter('practice')}
              aria-pressed={statusFilter === 'practice'}
            >
              Needs Practice ({practiceCount})
            </button>
          )}
          {dueCount > 0 && (
            <button
              type="button"
              className={`filter-pill filter-pill--alert ${statusFilter === 'due' ? 'active' : ''}`}
              onClick={() => setStatusFilter('due')}
              aria-pressed={statusFilter === 'due'}
            >
              Retention Due ({dueCount})
            </button>
          )}
          {insufficientCount > 0 && (
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'insufficient' ? 'active' : ''}`}
              onClick={() => setStatusFilter('insufficient')}
              aria-pressed={statusFilter === 'insufficient'}
            >
              Insufficient Data ({insufficientCount})
            </button>
          )}
        </div>

        <div className="concept-evidence-table__sort">
          <ArrowUpDown size={14} aria-hidden="true" />
          <label htmlFor="evidence-sort-select" className="visually-hidden">
            Sort evidence topics
          </label>
          <select
            id="evidence-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="concept-evidence-table__sort-select"
          >
            <option value="recent">Recently Observed</option>
            <option value="name">Alphabetical (A–Z)</option>
            <option value="gap">Highest Scaffold Gap</option>
          </select>
        </div>
      </div>

      {/* Rows */}
      <div className="concept-evidence-table__rows" role="list">
        {states.length === 0 ? (
          <EmptyState
            title="No recorded evidence yet"
            description="Complete learning sessions and answer assessment questions to record verifiable learning evidence."
          />
        ) : filteredStates.length === 0 ? (
          <div className="evidence-empty-search">
            <p>
              No topics matched &ldquo;<strong>{searchQuery}</strong>&rdquo;
              {statusFilter !== 'all' && ` with filter "${statusFilter}"`}.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          filteredStates.map((state) => (
            <ConceptEvidenceRow
              key={state.concept_id}
              state={state}
              onStudyConcept={onStudyConcept}
            />
          ))
        )}
      </div>
    </section>
  );
};
