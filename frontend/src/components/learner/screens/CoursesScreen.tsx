import { useEffect, useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Layers3,
  FileText,
  X,
  Sparkles,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import { api } from "../../../api";
import { CourseCreateModal } from "./courses/CourseCreateModal";
import { CourseFilterBar } from "./courses/CourseFilterBar";
import { CourseList } from "./courses/CourseList";
import { CourseDetailDrawer } from "./courses/CourseDetailDrawer";
import type { LearningLaunch } from "../../../types";

export function CoursesScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const { courses, subjects, map, documents, refresh, error, setError, loading } = useOvael();

  // Modal / studio form toggle
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notice, setNotice] = useState("");

  // Selected Course & Topics Management
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [concepts, setConcepts] = useState<{ concept_id: string; name: string }[]>([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [navigating, setNavigating] = useState(false);

  // Search & Filtering State for Courses List
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKind, setFilterKind] = useState<"all" | "personal" | "class">("all");
  const [sortBy, setSortBy] = useState<"name" | "topics" | "materials">("name");

  // Load topics for selected course
  useEffect(() => {
    let cancelled = false;
    setConcepts([]);
    if (!selectedCourseId) {
      setConceptsLoading(false);
      return;
    }
    setConceptsLoading(true);
    void api(`/v1/courses/${selectedCourseId}/concepts`)
      .then((rows) => {
        if (!cancelled) setConcepts(rows || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setConceptsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, setError]);

  const handleLearn = (launch: LearningLaunch) => {
    if (navigating) return;
    setNavigating(true);
    onLearn(launch);
    setTimeout(() => setNavigating(false), 1200);
  };

  // Filtered and sorted courses
  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => {
        const kind = c.course_kind || "personal";
        if (filterKind !== "all" && kind !== filterKind) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const subName = subjects.find((s) => s.subject_id === c.subject_id)?.name || "";
        return (
          c.name.toLowerCase().includes(q) ||
          subName.toLowerCase().includes(q) ||
          Boolean(c.description && c.description.toLowerCase().includes(q))
        );
      })
      .slice()
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "topics") {
          const aCount = map.nodes.filter((n) => n.subject_id === a.subject_id).length;
          const bCount = map.nodes.filter((n) => n.subject_id === b.subject_id).length;
          return bCount - aCount;
        }
        if (sortBy === "materials") {
          const aDocs = documents.filter((d) => d.course_id === a.course_id).length;
          const bDocs = documents.filter((d) => d.course_id === b.course_id).length;
          return bDocs - aDocs;
        }
        return 0;
      });
  }, [courses, filterKind, searchQuery, sortBy, subjects, map.nodes, documents]);

  const activeCourse = courses.find((c) => c.course_id === selectedCourseId);
  const totalTopics = map.nodes.length;
  const totalMaterials = documents.length;

  return (
    <div className="page courses-page">
      {/* Page Header */}
      <header className="page-heading courses-header">
        <div className="courses-header-info">
          <p className="eyebrow cobalt">Curriculum & Learning Paths</p>
          <h1 className="courses-title">Courses</h1>
          <p className="page-lead">
            Build personal courses, organize learning topics, and connect textbooks and notes for adaptive tutoring.
          </p>
        </div>

        <div className="courses-header-actions">
          <div className="courses-stats-pills" aria-label="Course summary metrics">
            <span className="stat-pill" title={`${courses.length} active courses`}>
              <BookOpen size={14} />
              <strong>{courses.length}</strong> {courses.length === 1 ? "course" : "courses"}
            </span>
            <span className="stat-pill" title={`${totalTopics} total concepts across subjects`}>
              <Layers3 size={14} />
              <strong>{totalTopics}</strong> concepts
            </span>
            <span className="stat-pill" title={`${totalMaterials} attached study materials`}>
              <FileText size={14} />
              <strong>{totalMaterials}</strong> materials
            </span>
          </div>

          <button
            type="button"
            className="create-course-trigger"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setNotice("");
            }}
            aria-expanded={showCreateForm}
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}
            <span>{showCreateForm ? "Close Studio" : "Create Course"}</span>
          </button>
        </div>
      </header>

      {/* Global Status/Notice Banner */}
      {notice && (
        <aside className="courses-notice-banner chat-notice-card" role="status">
          <Sparkles size={18} className="notice-icon" />
          <p>{notice}</p>
          <button
            type="button"
            className="icon-button close-notice-btn"
            onClick={() => setNotice("")}
            aria-label="Dismiss notice"
          >
            <X size={15} />
          </button>
        </aside>
      )}

      {/* Global Error Banner */}
      {error && (
        <aside className="courses-error-banner" role="alert">
          <AlertCircle size={18} className="notice-icon error-icon" />
          <p>{error}</p>
          <button
            type="button"
            className="icon-button close-notice-btn"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </aside>
      )}

      {/* Course Creation Studio (Collapsible Card) */}
      <CourseCreateModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        subjects={subjects}
        refresh={refresh}
        setError={setError}
        setNotice={setNotice}
        onCourseCreated={(courseId) => setSelectedCourseId(courseId)}
      />

      {/* Courses Search, Filter & View Controls */}
      <CourseFilterBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filterKind={filterKind}
        onFilterKindChange={setFilterKind}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        totalCoursesCount={courses.length}
        personalCoursesCount={courses.filter((c) => (c.course_kind || "personal") === "personal").length}
        classCoursesCount={courses.filter((c) => c.course_kind === "class").length}
      />

      {/* Main Course Cards Grid & Empty / Loading States */}
      {loading && courses.length === 0 ? (
        <div className="courses-loading-state" role="status" aria-live="polite">
          <LoaderCircle size={24} className="spin-icon courses-loading-spinner" />
          <span>Loading your courses &amp; curricula…</span>
        </div>
      ) : (
        <CourseList
          courses={courses}
          filteredCourses={filteredCourses}
          subjects={subjects}
          mapNodes={map.nodes}
          documents={documents}
          selectedCourseId={selectedCourseId}
          busy={navigating}
          searchQuery={searchQuery}
          onLearn={handleLearn}
          onToggleSelect={(courseId) =>
            setSelectedCourseId((prev) => (prev === courseId ? "" : courseId))
          }
          onCreateCourseClick={() => setShowCreateForm(true)}
          onResetFilters={() => {
            setSearchQuery("");
            setFilterKind("all");
          }}
        />
      )}

      {/* Selected Course Topics Studio & Inspector */}
      {selectedCourseId && activeCourse && (
        <CourseDetailDrawer
          course={activeCourse}
          concepts={concepts}
          conceptsLoading={conceptsLoading}
          setConcepts={setConcepts}
          refresh={refresh}
          setError={setError}
          onClose={() => setSelectedCourseId("")}
          onLearn={handleLearn}
        />
      )}
    </div>
  );
}
