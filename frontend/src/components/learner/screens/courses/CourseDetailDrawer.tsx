import { useState, useEffect, useRef } from "react";
import { X, Search, ArrowRight, Plus, Sparkles } from "lucide-react";
import { api } from "../../../../api";
import type { Course, LearningLaunch } from "../../../../types";

export interface CourseDetailDrawerProps {
  course: Course;
  concepts: { concept_id: string; name: string }[];
  setConcepts: React.Dispatch<React.SetStateAction<{ concept_id: string; name: string }[]>>;
  refresh: () => Promise<void>;
  setError: (msg: string) => void;
  onClose: () => void;
  onLearn: (launch: LearningLaunch) => void;
}

export function CourseDetailDrawer({
  course,
  concepts,
  setConcepts,
  refresh,
  setError,
  onClose,
  onLearn,
}: CourseDetailDrawerProps) {
  const [topicInput, setTopicInput] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [course.course_id]);

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !topicInput.trim() || !course.course_id) return;
    setBusy(true);
    try {
      await api(`/v1/courses/${course.course_id}/concepts`, "POST", {
        name: topicInput.trim(),
      });
      setConcepts(await api(`/v1/courses/${course.course_id}/concepts`));
      setTopicInput("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Topic creation failed.");
    } finally {
      setBusy(false);
    }
  }

  const filteredConcepts = concepts.filter((c) =>
    topicSearch ? c.name.toLowerCase().includes(topicSearch.toLowerCase()) : true,
  );

  return (
    <section ref={panelRef} className="topics-inspector-panel" aria-label="Course topics syllabus">
      <div className="topics-inspector-header">
        <div className="inspector-title-group">
          <div className="inspector-eyebrow-row">
            <span className="eyebrow cobalt">Curriculum Syllabus</span>
            <span className="concept-count-pill">{concepts.length} {concepts.length === 1 ? "concept" : "concepts"}</span>
          </div>
          <h2>{course.name}</h2>
          <p>
            Browse topic concepts, jump straight into targeted problem solving, or add custom topics.
          </p>
        </div>

        <button
          type="button"
          className="close-inspector-btn"
          onClick={onClose}
          aria-label="Close syllabus inspector"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search within concepts if there are more than 4 */}
      {concepts.length > 4 && (
        <div className="topics-search-wrap">
          <Search size={14} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label="Filter course concepts"
            value={topicSearch}
            onChange={(e) => setTopicSearch(e.target.value)}
            placeholder="Filter topics in this course…"
            className="topics-search-input"
          />
          {topicSearch && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setTopicSearch("")}
              aria-label="Clear topic search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Topics List */}
      <ul className="course-topics-list" aria-label="Topics in this course">
        {filteredConcepts.map((c, index) => (
          <li key={c.concept_id} className="course-topic-row">
            <div className="topic-meta-group">
              <span className="topic-index-badge">{index + 1}</span>
              <span className="topic-name">{c.name}</span>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-xs learn-topic-btn"
              onClick={() =>
                onLearn({
                  courseId: course.course_id,
                  conceptId: c.concept_id,
                  conceptName: c.name,
                })
              }
              title={`Start practice on ${c.name}`}
            >
              <span>Practice</span>
              <ArrowRight size={13} />
            </button>
          </li>
        ))}
      </ul>

      {concepts.length === 0 && (
        <div className="empty-topics-notice">
          <p>No individual concepts mapped yet. Add your first topic below to begin structured practice.</p>
        </div>
      )}

      {/* Add custom topic form for owner on user-defined subjects */}
      {course.membership === "owner" &&
        course.subject_id.startsWith("USR:") && (
          <form className="add-topic-inline-form" onSubmit={handleAddTopic}>
            <input
              aria-label="New topic name"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="Enter a new concept or chapter topic (e.g. Byzantine Fault Tolerance)"
              disabled={busy}
              className="add-topic-input"
            />
            <button
              type="submit"
              className="btn btn-secondary btn-sm add-topic-btn"
              disabled={busy || !topicInput.trim()}
            >
              <Plus size={14} />
              <span>Add Topic</span>
            </button>
          </form>
        )}

      {!course.subject_id.startsWith("USR:") && (
        <div className="curated-subject-note">
          <Sparkles size={15} />
          <p>
            This subject belongs to the shared institutional catalog. Its concepts and learning dependencies
            are curated and verified. To customize topics, create a course under <em>"New subject"</em>.
          </p>
        </div>
      )}
    </section>
  );
}
