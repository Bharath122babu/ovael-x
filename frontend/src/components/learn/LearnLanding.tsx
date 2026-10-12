import React from 'react';
import { PageHeader } from '../layout';
import { Alert } from '../ui';
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
            />
          </section>

          {/* Step 2: Topic Selection (active when course is selected) */}
          {selectedCourse && (
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
              />
            </section>
          )}
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
