import React, { useState } from 'react';
import { BookOpen, Check, Search, Plus } from 'lucide-react';
import { Badge, EmptyState, Button, Input } from '../ui';

export interface Concept {
  concept_id: string;
  name: string;
}

export interface TopicSelectorProps {
  courseName: string;
  concepts: Concept[];
  selectedConceptId: string;
  onSelectConcept: (conceptId: string) => void;
  onNavigateToCourses: () => void;
  loading?: boolean;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({
  courseName,
  concepts,
  selectedConceptId,
  onSelectConcept,
  onNavigateToCourses,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConcepts = concepts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="topic-selector">
      <div className="topic-selector__head">
        <div>
          <h3 className="topic-selector__title">
            <span>2. Select a Topic</span>
            <Badge variant="neutral" size="sm">
              {courseName}
            </Badge>
          </h3>
          <p className="topic-selector__desc">
            Topics define the targeted conceptual boundaries and assessment rubric.
          </p>
        </div>

        {concepts.length > 5 && (
          <div className="topic-selector__search">
            <Input
              inputSize="sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter topics..."
              leftElement={<Search size={14} />}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="topic-selector__loading">
          <div className="topic-skeleton" />
          <div className="topic-skeleton" />
          <div className="topic-skeleton" />
        </div>
      ) : concepts.length === 0 ? (
        <EmptyState
          title={`No topics yet in "${courseName}"`}
          description="Create your first topic or learning objective for this course to begin."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToCourses}
              leftIcon={<Plus size={15} />}
            >
              Add topic in Courses
            </Button>
          }
        />
      ) : filteredConcepts.length === 0 ? (
        <EmptyState
          title="No matching topics"
          description={`No topic matching "${searchQuery}".`}
          action={
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              Clear filter
            </Button>
          }
        />
      ) : (
        <div
          className="topic-selector__grid"
          role="radiogroup"
          aria-label={`Topics in ${courseName}`}
        >
          {filteredConcepts.map((item) => {
            const isSelected = item.concept_id === selectedConceptId;
            return (
              <button
                type="button"
                key={item.concept_id}
                role="radio"
                aria-checked={isSelected}
                className={`topic-card ${isSelected ? 'topic-card--selected' : ''}`}
                onClick={() => onSelectConcept(item.concept_id)}
              >
                <div className="topic-card__icon" aria-hidden="true">
                  <BookOpen size={16} />
                </div>
                <span className="topic-card__name">{item.name}</span>
                {isSelected && (
                  <span className="topic-card__check" aria-hidden="true">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
