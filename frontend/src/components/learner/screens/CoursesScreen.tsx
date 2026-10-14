import { useEffect, useState, useRef } from "react";
import { Plus, ArrowRight, BookOpen } from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import { api } from "../../../api";
import { ovaelApi } from "../../../api/client";
import { topicMermaid } from "../../../learningVisuals";
import type { LearningLaunch } from "../../../types";
export function CoursesScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const { courses, subjects, map, documents, refresh, setError } = useOvael();
  const [name, setName] = useState(""),
    [subject, setSubject] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [topic, setTopic] = useState(""),
    [concepts, setConcepts] = useState<{ concept_id: string; name: string }[]>(
      [],
    );
  const [subjectName, setSubjectName] = useState(""),
    [goal, setGoal] = useState(""),
    [outline, setOutline] = useState(""),
    [level, setLevel] = useState("beginner"),
    [files, setFiles] = useState<File[]>([]),
    [notice, setNotice] = useState("");
  const booksInput = useRef<HTMLInputElement>(null);
  const [resources, setResources] = useState<"yes" | "no" | null>(null);
  const [studyPlan, setStudyPlan] = useState("");
  const [reference, setReference] = useState("");
  function addFiles(incoming: File[]) {
    if (incoming.some((file) => file.size > 50 * 1024 * 1024)) {
      setError("Each file must be 50 MB or smaller.");
      return false;
    }
    setFiles((current) => [...current.filter((file) => !incoming.some((next) => next.name === file.name && next.size === file.size)), ...incoming]);
    return true;
  }
  async function importOutline(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      if (addFiles([file])) setNotice("Study map added as reference material. You can list its topics below.");
      return;
    }
    try {
      if (file.size > 200000)
        throw new Error("Choose a smaller study map (up to 200 KB).");
      const data = JSON.parse(await file.text());
      if (
        !Array.isArray(data.nodes) ||
        data.nodes.length > 60 ||
        !data.nodes.every(
          (item: any) =>
            typeof item.id === "string" &&
            typeof item.label === "string" &&
            item.label.length >= 2 &&
            item.label.length <= 200,
        )
      )
        throw new Error(
          "Choose an exported study map with up to 60 named topics.",
        );
      const edges = Array.isArray(data.edges)
        ? data.edges.filter(
            (edge: any) =>
              typeof edge.source === "string" &&
              typeof edge.target === "string" &&
              typeof edge.relation === "string",
          )
        : [];
      setOutline(data.nodes.map((item: any) => item.label).join("\n"));
      const material = new File(
        [
          `# Imported study outline\n\nThis is a study reference. Previous learning status is not imported.\n\n\`\`\`mermaid\n${topicMermaid(data.nodes, edges)}\n\`\`\`\n`,
        ],
        "imported-study-outline.md",
        { type: "text/markdown" },
      );
      setFiles((current) => [
        ...current.filter((item) => item.name !== material.name),
        material,
      ]);
      setNotice(
        "Topic outline imported. Learning scores and evidence are not copied.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not read the study map.",
      );
    }
  }
  useEffect(() => {
    let cancelled = false;
    setConcepts([]);
    if (!selected) {
      setConcepts([]);
      return;
    }
    void api(`/v1/courses/${selected}/concepts`)
      .then((rows) => {
        if (!cancelled) setConcepts(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, setError]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (!subject && !subjectName.trim())
        throw new Error("Name the subject you want to learn.");
      const uploadFiles = resources === "yes" ? files : [];
      if (uploadFiles.some((file) => file.size > 50 * 1024 * 1024))
        throw new Error("Each book or material must be 50 MB or smaller.");
      const topics = [
        ...new Set(
          outline
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ];
      if (
        topics.length > 60 ||
        topics.some((item) => item.length < 2 || item.length > 200)
      )
        throw new Error(
          "Add up to 60 topics, each between 2 and 200 characters.",
        );
      const c = await api("/v1/courses", "POST", {
        name: name.trim(),
        ...(subject
          ? { subject_id: subject }
          : { subject_name: subjectName.trim() }),
        description: [
          `Learning goal: ${goal.trim() || name.trim()}`,
          `Starting level: ${level}`,
          ...(resources === "no" && studyPlan.trim() ? [`Study plan preferences: ${studyPlan.trim()}`] : []),
          ...(resources === "no" && reference.trim() ? [`Optional book or online reference: ${reference.trim()}`] : []),
        ].join("\n"),
        course_kind: "personal",
      });
      await refresh();
      setSelected(c.course_id);
      setNotice("Course created. Adding your topics and materials…");
      if (!subject) {
        for (const title of topics.length ? topics : ["Getting started"])
          await api(`/v1/courses/${c.course_id}/concepts`, "POST", {
            name: title,
          });
      }
      let failed = 0;
      for (const file of uploadFiles) {
        try {
          const document = await ovaelApi.uploadDocument(
            file,
            c.course_id,
            false,
          );
          if (!["ready", "ready_partial"].includes(document.status)) failed++;
        } catch {
          failed++;
        }
      }
      setNotice(
        failed
          ? `Course created. ${failed} material(s) could not be processed. Check Materials and add any missing files.`
          : uploadFiles.length
            ? "Course ready. Your uploaded files are also in Materials."
            : "Course ready. You can start now and add material later.",
      );
      setName("");
      setSubjectName("");
      setGoal("");
      setOutline("");
      setFiles([]);
      setResources(null);
      setStudyPlan("");
      setReference("");
      if (booksInput.current) booksInput.current.value = "";
      await refresh();
      setConcepts(await api(`/v1/courses/${c.course_id}/concepts`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Course creation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !topic.trim()) return;
    setBusy(true);
    try {
      await api(`/v1/courses/${selected}/concepts`, "POST", {
        name: topic.trim(),
      });
      setConcepts(await api(`/v1/courses/${selected}/concepts`));
      setTopic("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Topic creation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <header className="page-heading">
        <p className="eyebrow blue">Your courses</p>
        <h1>Courses</h1>
        <p>
          Build a personal course or continue with material from your class.
        </p>
      </header>
      <section className="course-create">
        <h2>Create a personal course</h2>
        <form onSubmit={create} className="lesson-setup">
          <label>
            Course name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Interview preparation"
            />
          </label>
          <label>
            Subject
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">New subject</option>
              {subjects.map((s) => (
                <option value={s.subject_id} key={s.subject_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {!subject && (
            <label>
              Your subject
              <input
                required
                value={subjectName}
                maxLength={200}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Game design, statistics, music theory"
              />
            </label>
          )}
          <label>
            What do you want to learn?
            <textarea
              value={goal}
              maxLength={1500}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Your goal, exam, project, or a short learning brief"
            />
          </label>
          <label>
            Starting point
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="beginner">Starting fresh</option>
              <option value="some_experience">Some experience</option>
              <option value="review">Reviewing what I know</option>
            </select>
          </label>
          {!subject && (
            <label className="course-plan-field">
              Topics to cover (optional)
              <textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="One topic per line, or separated by commas"
              />
            </label>
          )}
          <fieldset className="course-resource-choice" disabled={busy}>
            <legend>Do you have a study map, books, or material? (optional)</legend>
            <div className="resource-options">
              <label className={resources === "yes" ? "selected" : ""}>
                <input type="radio" name="course-resources" checked={resources === "yes"} onChange={() => setResources("yes")} />
                <span><strong>Yes</strong><small>Add files below.</small></span>
              </label>
              <label className={resources === "no" ? "selected" : ""}>
                <input type="radio" name="course-resources" checked={resources === "no"} onChange={() => setResources("no")} />
                <span><strong>No</strong><small>Start without uploading anything.</small></span>
              </label>
            </div>
            <small>You can skip this and add material later.</small>
          </fieldset>
          {resources === "no" && <>
            <label className="course-plan-field">
              How should your study plan look? (optional)
              <textarea value={studyPlan} disabled={busy} maxLength={1500} onChange={(e) => setStudyPlan(e.target.value)} placeholder="Describe your schedule, target date, practice needs, or how you want lessons broken down." />
            </label>
            <label className="course-plan-field">
              Book or online resource details (optional)
              <textarea value={reference} disabled={busy} maxLength={500} onChange={(e) => setReference(e.target.value)} placeholder="A book title, author, link, or description of the resource you want to study. Leave blank if you want help choosing." />
            </label>
          </>}
          {resources === "yes" && (
            <label>
              Study map or syllabus (optional)
              <input
                type="file"
                disabled={busy}
                accept=".json,.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
                onChange={(e) => void importOutline(e.target.files?.[0])}
              />
              <small>
                PDF, notes, or an image up to 50 MB. An exported JSON map (up to 200 KB) can also fill topics for a new subject.
              </small>
            </label>
          )}
          {resources === "yes" && <label>
            Books and material (optional)
            <input
              type="file"
              multiple
              disabled={busy}
              ref={booksInput}
              accept=".pdf,.epub,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,.mp4,.webm,.mov"
              onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; }}
            />
            <small>
              Up to 50 MB per file. Books are read page by page and also appear
              in Materials.
            </small>
          </label>}
          {resources === "yes" && files.length > 0 && <ul className="course-upload-list" aria-label="Selected course files">
            {files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" className="text-button" disabled={busy} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}>Remove</button></li>)}
          </ul>}

          <button className="primary-button" disabled={busy || !name.trim()}>
            <Plus size={16} />
            Create course
          </button>
        </form>
        {notice && <p role="status">{notice}</p>}
      </section>
      <div className="course-cards">
        {courses.map((c) => (
          <article key={c.course_id}>
            <BookOpen size={24} />
            <p className="eyebrow">
              {c.course_kind === "class" ? "Class course" : "Personal course"}
            </p>
            <h2>{c.name}</h2>
            <p>
              {c.description ||
                "Your workspace to learn, practice, and review."}
            </p>
            <small>
              {map.nodes.filter((n) => n.subject_id === c.subject_id).length}{" "}
              topics ·{" "}
              {documents.filter((d) => d.course_id === c.course_id).length}{" "}
              materials
            </small>
            <div className="lesson-actions">
              <button
                className="primary-button"
                onClick={() =>
                  onLearn({ courseId: c.course_id, subjectId: c.subject_id })
                }
              >
                Continue <ArrowRight size={15} />
              </button>
              <button
                className="quiet-button"
                disabled={busy}
                onClick={() => setSelected(c.course_id)}
              >
                View topics
              </button>
            </div>
          </article>
        ))}
      </div>
      {!courses.length && (
        <p className="empty-state">
          Create your first course above, then add a topic or upload material.
        </p>
      )}
      {selected && (
        <section className="course-create">
          <h2>
            {courses.find((c) => c.course_id === selected)?.name} · topics
          </h2>
          <ul className="topic-list">
            {concepts.map((c) => (
              <li key={c.concept_id}>
                <span>{c.name}</span>
                <button
                  className="text-button"
                  onClick={() =>
                    onLearn({ courseId: selected, conceptId: c.concept_id })
                  }
                >
                  Learn <ArrowRight size={14} />
                </button>
              </li>
            ))}
          </ul>
          {courses.find((c) => c.course_id === selected)?.membership ===
            "owner" &&
            courses
              .find((c) => c.course_id === selected)
              ?.subject_id.startsWith("USR:") && (
              <form className="inline-form" onSubmit={add}>
                <input
                  aria-label="New topic name"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Add a topic"
                />
                <button
                  className="secondary-button"
                  disabled={busy || !topic.trim()}
                >
                  Add topic
                </button>
              </form>
            )}
          {!courses
            .find((c) => c.course_id === selected)
            ?.subject_id.startsWith("USR:") && (
            <p className="subtle">
              Built-in topics are shared catalog content. Create a course with
              “New subject” to add your own topics.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
