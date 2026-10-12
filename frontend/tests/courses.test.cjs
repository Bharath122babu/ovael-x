/* Course Library and Topic Management UI tests using Node test runner. */
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
  CourseCard,
  TopicManager,
  CourseDetailView,
  CreateCourseModal,
  EditCourseModal,
  DeleteCourseModal,
  CourseLibrary,
} = require('../src/components/courses/index.ts');

const sampleCourses = [
  {
    course_id: 'c101',
    name: 'Advanced Cellular Biochemistry',
    subject_id: 'bio-401',
    description: 'Enzyme kinetics, metabolic regulation, and mitochondrial bioenergetics.',
    course_kind: 'personal',
    membership: 'owner',
    owner_user_id: 'u1',
    updated_at: '2026-10-10T12:00:00Z',
  },
  {
    course_id: 'c102',
    name: 'Distributed Systems & Consensus',
    subject_id: 'cs-502',
    description: 'Raft, Paxos, causal consistency, and Byzantine fault tolerance.',
    course_kind: 'class',
    membership: 'learner',
    owner_user_id: 'teacher1',
    updated_at: '2026-10-11T15:30:00Z',
  },
];

const sampleConcepts = [
  { concept_id: 'CON:bio_resp_01', name: 'Oxidative Phosphorylation' },
  { concept_id: 'CON:bio_resp_02', name: 'ATP Synthase Rotary Mechanism' },
  { concept_id: 'CON:bio_resp_03', name: 'Krebs Cycle Dehydrogenases' },
];

test('CourseCard renders title, description, subject ID, badges, and learning actions', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CourseCard, {
      course: sampleCourses[0],
      isOwner: true,
      onOpenDetails: () => {},
      onStartLearning: () => {},
      onEditCourse: () => {},
      onDeleteCourse: () => {},
    })
  );

  assert.match(html, /Advanced Cellular Biochemistry/);
  assert.match(html, /Enzyme kinetics, metabolic regulation/);
  assert.match(html, /bio-401/);
  assert.match(html, /Personal/);
  assert.match(html, /Owner/);
  assert.match(html, /Manage Topics/);
  assert.match(html, /Start Learning/);
  // Owner action buttons present
  assert.match(html, /Edit Advanced Cellular Biochemistry/);
  assert.match(html, /Delete Advanced Cellular Biochemistry/);
});

test('CourseCard omits management buttons when user is not owner', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CourseCard, {
      course: sampleCourses[1],
      isOwner: false,
      onOpenDetails: () => {},
      onStartLearning: () => {},
    })
  );

  assert.match(html, /Distributed Systems &amp; Consensus|Distributed Systems & Consensus/);
  assert.match(html, /Classroom/);
  assert.match(html, /Enrolled/);
  assert.doesNotMatch(html, /Edit Distributed Systems/);
  assert.doesNotMatch(html, /Delete Distributed Systems/);
});

test('TopicManager renders topic counter, rows, concept IDs, and study button', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TopicManager, {
      course: sampleCourses[0],
      concepts: sampleConcepts,
      onAddConcept: async () => {},
      onSelectTopic: () => {},
      onStartLearningTopic: () => {},
      isOwner: true,
    })
  );

  assert.match(html, /Course Topics/);
  assert.match(html, /3 topics/);
  assert.match(html, /Oxidative Phosphorylation/);
  assert.match(html, /ATP Synthase Rotary Mechanism/);
  assert.match(html, /CON:bio_resp_01/);
  assert.match(html, /Study Topic/);
  // Add topic form visible for owner
  assert.match(html, /Add Topic/);
  assert.match(html, /new-topic-name-input/);
});

test('TopicManager renders empty state when course contains no topics', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(TopicManager, {
      course: sampleCourses[0],
      concepts: [],
      onAddConcept: async () => {},
      isOwner: true,
    })
  );

  assert.match(html, /No topics added yet/);
});

test('CreateCourseModal renders dialog with title input, description textarea, and role choices', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CreateCourseModal, {
      isOpen: true,
      onClose: () => {},
      onCreateCourse: async () => {},
      userRole: 'teacher',
    })
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /Create a New Course/);
  assert.match(html, /course-name-input/);
  assert.match(html, /course-desc-input/);
  assert.match(html, /Personal Workspace/);
  assert.match(html, /Classroom Course/);
  assert.match(html, /Create Course/);
});

test('EditCourseModal renders pre-filled fields and save button', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(EditCourseModal, {
      isOpen: true,
      course: sampleCourses[0],
      onClose: () => {},
      onUpdateCourse: async () => {},
    })
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /Edit Course Details/);
  assert.match(html, /Advanced Cellular Biochemistry/);
  assert.match(html, /Enzyme kinetics, metabolic regulation/);
  assert.match(html, /Save Changes/);
});

test('DeleteCourseModal displays confirmation dialog and documents prerequisite notice', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(DeleteCourseModal, {
      isOpen: true,
      course: sampleCourses[0],
      onClose: () => {},
      onDeleteCourse: async () => {},
    })
  );

  assert.match(html, /role="dialog"/);
  assert.match(html, /Delete Course/);
  assert.match(html, /Are you sure you want to delete/);
  assert.match(html, /Advanced Cellular Biochemistry/);
  assert.match(html, /deleting those documents first/);
});

test('CourseDetailView renders breadcrumb, hero summary, topic manager, and material upload section', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CourseDetailView, {
      course: sampleCourses[0],
      concepts: sampleConcepts,
      onBack: () => {},
      onEditCourse: () => {},
      onDeleteCourse: () => {},
      onAddConcept: async () => {},
      onStartLearningCourse: () => {},
      onUploadMaterial: async () => {},
      isOwner: true,
    })
  );

  assert.match(html, /Back to all courses/);
  assert.match(html, /Advanced Cellular Biochemistry/);
  assert.match(html, /Study Course/);
  assert.match(html, /Course Topics/);
  assert.match(html, /Reference Material/);
  assert.match(html, /Choose file to upload/);
  assert.match(html, /Workspace Overview/);
});

test('CourseLibrary renders page header, search toolbar, filter pills, and course cards', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CourseLibrary, {
      courses: sampleCourses,
      activeCourseId: 'c101',
      onSelectCourse: () => {},
      concepts: sampleConcepts,
      activeConceptId: 'CON:bio_resp_01',
      onSelectConcept: () => {},
      user: { user_id: 'u1', username: 'learner1', role: 'learner' },
      onCreateCourse: async () => {},
      onUpdateCourse: async () => {},
      onDeleteCourse: async () => {},
      onAddConcept: async () => {},
      onNavigateToLearn: () => {},
      onUploadMaterial: async () => {},
    })
  );

  assert.match(html, /My Courses/);
  assert.match(html, /KNOWLEDGE REPOSITORY/);
  assert.match(html, /Search courses/);
  assert.match(html, /All \(2\)/);
  assert.match(html, /Personal \(1\)/);
  assert.match(html, /Classroom \(1\)/);
  assert.match(html, /Advanced Cellular Biochemistry/);
  assert.match(html, /Distributed Systems &amp; Consensus|Distributed Systems & Consensus/);
});

test('CourseLibrary renders clean empty state when no courses exist', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(CourseLibrary, {
      courses: [],
      activeCourseId: '',
      onSelectCourse: () => {},
      concepts: [],
      activeConceptId: '',
      onSelectConcept: () => {},
      user: { user_id: 'u1', username: 'learner1', role: 'learner' },
      onCreateCourse: async () => {},
      onUpdateCourse: async () => {},
      onDeleteCourse: async () => {},
      onAddConcept: async () => {},
      onNavigateToLearn: () => {},
      onUploadMaterial: async () => {},
    })
  );

  assert.match(html, /No courses created yet/);
  assert.match(html, /Create a course/);
});
