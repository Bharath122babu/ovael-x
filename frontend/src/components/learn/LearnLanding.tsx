import React from 'react';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '../layout';
import { Alert } from '../ui';
import { AdaptiveLearningMotif } from '../visuals';
import { CourseSelector, Course } from './CourseSelector';
import { TopicSelector, Concept } from './TopicSelector';
import { SessionSetupPanel, LearningIntent } from './SessionSetupPanel';

export interface LearnLandingProps {
  courses: Course[];
  activeCourseId: string;
  onSelectCourse: (courseId: string) => void;
  concepts: Concept[];
  activeConceptId: string;
  onSelectConcept: (conceptId: string) => void;
  goal: string;
  onGoalChange: (goal: string) => void;
  onStartSession: (mode: LearningIntent) => void;
  onNavigateToCourses: () => void;
  busy?: boolean;
  error?: string;
  onClearError?: () => void;
  conceptsLoading?: boolean;
}

export const LearnLanding: React.FC<LearnLandingProps> = ({
  courses,
  activeCourseId,
  onSelectCourse,
  concepts,
  activeConceptId,
  onSelectConcept,
  goal,
  onGoalChange,
  onStartSession,
  onNavigateToCourses,
  busy = false,
  error = '',
  onClearError,
  conceptsLoading = false,
}) => {
  const selectedCourse = courses.find((c) => c.course_id === activeCourseId);
  const selectedConcept = concepts.find((c) => c.concept_id === activeConceptId);

  const canStart = Boolean(activeCourseId && activeConceptId);

  return (
    <div className="learn-landing">
      <PageHeader
        eyebrow="ADAPTIVE WORKSPACE"
        title="What would you like to learn"
        description="Choose a course and topic to begin your next learning session."
        actions={<AdaptiveLearningMotif variant="compact" />}
      />

      {error && (
        <div className="learn-landing__error" role="alert">
          <Alert variant="error" onDismiss={onClearError}>
            {error}
          </Alert>
        </div>
      )}

      <div className="learn-landing__layout">
        <main className="learn-landing__main">
          {/* Step 1: Course Selection */}
          <section aria-labelledby="courses-section-title">
            <CourseSelector
              courses={courses}
              selectedCourseId={activeCourseId}
              onSelectCourse={onSelectCourse}
              onNavigateToCourses={onNavigateToCourses}
              activeConceptCount={concepts.length}
            />
          </section>

          {/* Step 2: Topic Selection (active when course is selected) */}
          {selectedCourse ? (
            <section
              aria-labelledby="topics-section-title"
              className="learn-landing__topics-section"
            >
              <TopicSelector
                courseName={selectedCourse.name}
                concepts={concepts}
                selectedConceptId={activeConceptId}
                onSelectConcept={onSelectConcept}
                onNavigateToCourses={onNavigateToCourses}
                loading={conceptsLoading}
              />
            </section>
          ) : courses.length > 0 ? (
            <div className="learn-landing__topic-placeholder">
              <div className="topic-placeholder-card">
                <div className="topic-placeholder-card__icon" aria-hidden="true">
                  <BookOpen size={20} />
                </div>
                <div className="topic-placeholder-card__text">
                  <h4>Step 2: Topic Selection</h4>
                  <p>Choose a course above to reveal its structured topics and learning objectives.</p>
                </div>
              </div>
            </div>
          ) : null}
        </main>

        <div className="learn-landing__aside">
          <SessionSetupPanel
            selectedCourseName={selectedCourse?.name}
            selectedConceptName={selectedConcept?.name}
            canStart={canStart}
            goal={goal}
            onGoalChange={onGoalChange}
            onStart={onStartSession}
            busy={busy}
          />
        </div>
      </div>
    </div>
  );
};
