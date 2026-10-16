import { useState } from "react";
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

  return (
    <section className="topics-inspector-panel" aria-label="Course topics syllabus">
      <div className="topics-inspector-header">
        <div className="inspector-title-group">
          <span className="eyebrow coral">Syllabus & Concept Hierarchy</span>
          <h2>{course.name}</h2>
          <p>
            Browse topic concepts, jump straight into targeted problem solving, or add custom topics.
          </p>
        </div>

        <button
          type="button"
          className="icon-button close-inspector-btn"
          onClick={onClose}
          aria-label="Close topic inspector"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search within concepts if there are many */}
      {concepts.length > 5 && (
        <div className="topics-search-wrap">
          <Search size={15} />
          <input
            type="search"
            aria-label="Search course concepts"
            value={topicSearch}
            onChange={(e) => setTopicSearch(e.target.value)}
            placeholder="Filter topics in this course…"
            className="topics-search-input"
          />
          {topicSearch && (
            <button
              type="button"
              className="icon-button"
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
        {concepts
          .filter((c) =>
            topicSearch ? c.name.toLowerCase().includes(topicSearch.toLowerCase()) : true
          )
          .map((c, index) => (
            <li key={c.concept_id} className="course-topic-row">
              <div className="topic-meta-group">
                <span className="topic-index-badge">{index + 1}</span>
                <span className="topic-name">{c.name}</span>
              </div>

              <button
                type="button"
                className="primary-button learn-topic-btn"
                onClick={() =>
                  onLearn({
                    courseId: course.course_id,
                    conceptId: c.concept_id,
                    conceptName: c.name,
                  })
                }
                title={`Start practice on ${c.name}`}
              >
                <span>Practice Topic</span>
                <ArrowRight size={14} />
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
              className="secondary-button add-topic-btn"
              disabled={busy || !topicInput.trim()}
            >
              <Plus size={15} />
              <span>Add Topic</span>
            </button>
          </form>
        )}

      {!course.subject_id.startsWith("USR:") && (
        <div className="curated-subject-note">
          <Sparkles size={16} />
          <p>
            This subject belongs to the shared institutional catalog. Its concepts and learning dependencies
            are curated and verified. To customize topics, create a course under <em>"New subject"</em>.
          </p>
        </div>
      )}
    </section>
  );
}
