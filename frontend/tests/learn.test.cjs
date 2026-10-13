/* Learn landing and session setup UI tests using Node test runner. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const React = require('react');
const ReactDOMServer = require('react-dom/server');

// Register ts and tsx compilation for Node CommonJS loader with esModuleInterop
require.extensions['.ts'] = require.extensions['.tsx'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  module._compile(code, filename);
};

const {
  CourseSelector,
  TopicSelector,
  SessionSetupPanel,
  LearnLanding,
} = require('../src/components/learn/index.ts');

const sampleCourses = [
  {
    course_id: 'c1',
    name: 'Cell Biology & Genetics',
    description: 'Fundamental cellular mechanisms and hereditary genetics',
    course_kind: 'personal',
    subject_id: 'bio-101',
  },
  {
    course_id: 'c2',
    name: 'Distributed Systems',
    description: 'Consensus algorithms, replication, and fault tolerance',
    course_kind: 'class',
    subject_id: 'cs-401',
  },
];

const sampleConcepts = [
  { concept_id: 't1', name: 'Mitochondrial Respiration' },
  { concept_id: 't2', name: 'DNA Polymerase Replication Fork' },
  { concept_id: 't3', name: 'Mendelian Independent Assortment' },
];

test('CourseSelector renders available courses with radiogroup and badge count', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CourseSelector, {
      courses: sampleCourses,
      selectedCourseId: 'c1',
      onSelectCourse: () => {},
      onNavigateToCourses: () => {},
    })
  );

  assert.match(html, /1\. Choose a Course/);
  assert.match(html, /2 courses/);
  assert.match(html, /Cell Biology &amp; Genetics|Cell Biology & Genetics/);
  assert.match(html, /Distributed Systems/);
  // Radio semantics and checked state
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /course-card--selected/);
});

test('CourseSelector renders empty state with CTA when no courses are present', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CourseSelector, {
      courses: [],
      selectedCourseId: '',
      onSelectCourse: () => {},
      onNavigateToCourses: () => {},
    })
  );

  assert.match(html, /No courses created yet/);
  assert.match(html, /Create a course/);
});

test('TopicSelector displays topics with radio selection and empty state', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TopicSelector, {
      courseName: 'Cell Biology & Genetics',
      concepts: sampleConcepts,
      selectedConceptId: 't2',
      onSelectConcept: () => {},
      onNavigateToCourses: () => {},
    })
  );

  assert.match(html, /2\. Select a Topic/);
  assert.match(html, /Mitochondrial Respiration/);
  assert.match(html, /DNA Polymerase Replication Fork/);
  assert.match(html, /topic-card--selected/);
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /aria-checked="true"/);
});

test('TopicSelector displays empty state when selected course has no topics', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TopicSelector, {
      courseName: 'New Empty Course',
      concepts: [],
      selectedConceptId: '',
      onSelectConcept: () => {},
      onNavigateToCourses: () => {},
    })
  );

  assert.match(html, /No topics yet in &quot;New Empty Course&quot;|No topics yet in "New Empty Course"/);
  assert.match(html, /Add topic in Courses/);
});

test('SessionSetupPanel displays target summary, mode choices, goal input, and disabled CTA when cannot start', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SessionSetupPanel, {
      selectedCourseName: undefined,
      selectedConceptName: undefined,
      canStart: false,
      goal: '',
      onGoalChange: () => {},
      onStart: () => {},
      busy: false,
    })
  );

  assert.match(html, /SESSION WORKSPACE/);
  assert.match(html, /Ready to Begin/);
  assert.match(html, /Guided Study/);
  assert.match(html, /Targeted Practice/);
  assert.match(html, /Learning Goal or Focus \(Optional\)/);
  assert.match(html, /Grounded decision engine/);
  // Disabled CTA
  assert.match(html, /Select a topic to start/);
  assert.match(html, /disabled/);
});

test('SessionSetupPanel enables CTA when course and topic are selected', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SessionSetupPanel, {
      selectedCourseName: 'Cell Biology',
      selectedConceptName: 'Mitochondrial Respiration',
      canStart: true,
      goal: 'Understand ATP synthase coupling',
      onGoalChange: () => {},
      onStart: () => {},
      busy: false,
    })
  );

  assert.match(html, /Start guided study/);
  assert.doesNotMatch(html, /Select a topic to start/);
  assert.match(html, /Cell Biology/);
  assert.match(html, /Mitochondrial Respiration/);
});

test('LearnLanding orchestrates header, course selector, topic selector, and setup aside', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LearnLanding, {
      courses: sampleCourses,
      activeCourseId: 'c1',
      onSelectCourse: () => {},
      concepts: sampleConcepts,
      activeConceptId: 't1',
      onSelectConcept: () => {},
      goal: '',
      onGoalChange: () => {},
      onStartSession: () => {},
      onNavigateToCourses: () => {},
      busy: false,
    })
  );

  assert.match(html, /ADAPTIVE WORKSPACE/);
  assert.match(html, /What would you like to learn/);
  assert.match(html, /1\. Choose a Course/);
  assert.match(html, /2\. Select a Topic/);
  assert.match(html, /Ready to Begin/);
  assert.match(html, /learn-landing__layout/);
  assert.match(html, /learn-landing__main/);
  assert.match(html, /learn-landing__aside/);
});

test('LearnLanding displays error alert when error prop is passed', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LearnLanding, {
      courses: sampleCourses,
      activeCourseId: '',
      onSelectCourse: () => {},
      concepts: [],
      activeConceptId: '',
      onSelectConcept: () => {},
      goal: '',
      onGoalChange: () => {},
      onStartSession: () => {},
      onNavigateToCourses: () => {},
      busy: false,
      error: 'Backend communication error: connection failed',
    })
  );

  assert.match(html, /Backend communication error: connection failed/);
  assert.match(html, /role="alert"/);
});

test('SessionSetupPanel provides Review & Retention mode and supports all three intents', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(SessionSetupPanel, {
      selectedCourseName: 'Cell Biology',
      selectedConceptName: 'Mitochondrial Respiration',
      canStart: true,
      goal: '',
      onGoalChange: () => {},
      onStart: () => {},
      busy: false,
    })
  );

  assert.match(html, /Guided Study/);
  assert.match(html, /Targeted Practice/);
  assert.match(html, /Review &amp; Retention|Review & Retention/);
  assert.match(html, /Spaced retrieval, edge-case probing, and retention consolidation/);
});

test('CourseSelector renders derived real topic count badge when present', () => {
  const coursesWithCounts = [
    {
      course_id: 'c1',
      name: 'Cell Biology',
      description: 'Cellular processes',
      concept_count: 5,
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CourseSelector, {
      courses: coursesWithCounts,
      selectedCourseId: 'c1',
      onSelectCourse: () => {},
      onNavigateToCourses: () => {},
      activeConceptCount: 5,
    })
  );

  assert.match(html, /5 topics/);
});

test('LearnLanding displays Step 2 guidance placeholder when no course is active', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LearnLanding, {
      courses: sampleCourses,
      activeCourseId: '',
      onSelectCourse: () => {},
      concepts: [],
      activeConceptId: '',
      onSelectConcept: () => {},
      goal: '',
      onGoalChange: () => {},
      onStartSession: () => {},
      onNavigateToCourses: () => {},
      busy: false,
    })
  );

  assert.match(html, /Step 2: Topic Selection/);
  assert.match(html, /Choose a course above to reveal its structured topics/);
});
