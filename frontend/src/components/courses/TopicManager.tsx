import React, { useState } from 'react';
import { BookOpen, Plus, Search, ArrowRight, Play, Check, AlertCircle } from 'lucide-react';
import { Button, Input, Field, Badge, EmptyState, Alert } from '../ui';
import { Course, Concept } from './types';

export interface TopicManagerProps {
  course: Course;
  concepts: Concept[];
  onAddConcept: (name: string) => Promise<void>;
  onSelectTopic?: (conceptId: string) => void;
  onStartLearningTopic?: (conceptId: string) => void;
  busy?: boolean;
  isOwner?: boolean;
}

export const TopicManager: React.FC<TopicManagerProps> = ({
  course,
  concepts,
  onAddConcept,
  onSelectTopic,
  onStartLearningTopic,
  busy = false,
  isOwner = true,
}) => {
  const [newTopicName, setNewTopicName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTopicName.trim();
    if (!trimmed) {
      setError('Topic name cannot be empty.');
      return;
    }
    if (trimmed.length < 2) {
      setError('Topic name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 200) {
      setError('Topic name must be 200 characters or fewer.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onAddConcept(trimmed);
      setNewTopicName('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add topic.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredConcepts = concepts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.concept_id.toLowerCase().includes(q)
    );
  });

  return (
    <section className="topic-manager" aria-labelledby="topic-manager-heading">
      <div className="topic-manager__header">
        <div>
          <div className="topic-manager__title-wrap">
            <h3 id="topic-manager-heading" className="topic-manager__title">
              Course Topics
            </h3>
            <Badge variant="primary" size="sm">
              {concepts.length} {concepts.length === 1 ? 'topic' : 'topics'}
            </Badge>
          </div>
          <p className="topic-manager__desc">
            Topics define the learning objectives and evaluation targets for adaptive sessions in{' '}
            <strong>{course.name}</strong>.
          </p>
        </div>
      </div>

      {error && (
        <div className="topic-manager__alert" role="alert">
          <Alert variant="error" onDismiss={() => setError('')}>
            {error}
          </Alert>
        </div>
      )}

      {/* Add Topic Form (Available when user is course owner) */}
      {isOwner && (
        <form onSubmit={handleAddSubmit} className="topic-manager__add-form">
          <div className="topic-manager__input-wrap">
            <Input
              id="new-topic-name-input"
              value={newTopicName}
              onChange={(e) => {
                setNewTopicName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g., Mitochondrial Respiration, QuickSort, Brachial Plexus..."
              disabled={busy || submitting}
              maxLength={200}
              aria-label="New topic name"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={busy || submitting || newTopicName.trim().length < 2}
            leftIcon={<Plus size={16} />}
          >
            Add Topic
          </Button>
        </form>
      )}

      {/* Search / Filter toolbar when more than 4 topics */}
      {concepts.length > 4 && (
        <div className="topic-manager__filter-bar">
          <div className="topic-manager__search-box">
            <Search size={15} className="search-icon" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics..."
              className="topic-manager__search-input"
              aria-label="Filter topics in this course"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear topic filter"
              >
                Clear
              </button>
            )}
          </div>
          <span className="topic-manager__filter-count">
            Showing {filteredConcepts.length} of {concepts.length}
          </span>
        </div>
      )}

      {/* Topics list */}
      <div className="topic-manager__list" role="list">
        {concepts.length === 0 ? (
          <EmptyState
            title="No topics added yet"
            description="Add your first topic above to establish curriculum targets and begin adaptive tutoring."
          />
        ) : filteredConcepts.length === 0 ? (
          <div className="topic-manager__empty-search">
            <p>No topics matched &ldquo;{searchQuery}&rdquo;.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSearchQuery('')}
            >
              Clear filter
            </Button>
          </div>
        ) : (
          filteredConcepts.map((item, index) => {
            const indexFormatted = String(index + 1).padStart(2, '0');
            return (
              <div
                key={item.concept_id}
                className="topic-row"
                role="listitem"
              >
                <div className="topic-row__leading">
                  <span className="topic-row__index">{indexFormatted}</span>
                  <div className="topic-row__info">
                    <h4 className="topic-row__name">{item.name}</h4>
                    <span className="topic-row__meta">
                      <code>{item.concept_id}</code>
                    </span>
                  </div>
                </div>

                <div className="topic-row__actions">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (onStartLearningTopic) {
                        onStartLearningTopic(item.concept_id);
                      } else if (onSelectTopic) {
                        onSelectTopic(item.concept_id);
                      }
                    }}
                    leftIcon={<Play size={13} fill="currentColor" />}
                  >
                    Study Topic
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
