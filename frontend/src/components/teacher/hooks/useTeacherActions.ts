import { useState } from "react";
import { ovaelApi } from "../../../api/client";
import type { Course } from "../../../types";
import type { TeacherTab, UnenrollTarget } from "../types";

export interface UseTeacherActionsParams {
  course?: Course;
  courseDocuments: Array<{ document_id: string }>;
  refresh: () => Promise<void>;
  setError: (msg: string) => void;
  setSuccessMsg: (msg: string) => void;
  setCourseId: (id: string) => void;
  setLearners: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>;
  setProposals: React.Dispatch<React.SetStateAction<Array<Record<string, unknown>>>>;
  setActiveGraph: React.Dispatch<React.SetStateAction<Record<string, unknown> | null>>;
  setTab: (tab: TeacherTab) => void;
}

export function useTeacherActions({
  course,
  courseDocuments,
  refresh,
  setError,
  setSuccessMsg,
  setCourseId,
  setLearners,
  setProposals,
  setActiveGraph,
  setTab,
}: UseTeacherActionsParams) {
  // Form states
  const [courseName, setCourseName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [learnerName, setLearnerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Modal visibility states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [unenrollTarget, setUnenrollTarget] = useState<UnenrollTarget | null>(null);
  const [proposalObjective, setProposalObjective] = useState("");
  const [showProposeModal, setShowProposeModal] = useState(false);

  const createCourse = async () => {
    if (!courseName.trim() || !subjectName.trim()) return;
    setBusy(true);
    try {
      const created = await ovaelApi.createCourse({
        name: courseName.trim(),
        subject_name: subjectName.trim(),
        description: "Teacher-managed OVAEL-X class cohort",
        course_kind: "class",
      });
      await refresh();
      setCourseId(created.course_id);
      setCourseName("");
      setSubjectName("");
      setShowCreateModal(false);
      setSuccessMsg(`Class course "${created.name}" created successfully.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Course could not be created",
      );
    } finally {
      setBusy(false);
    }
  };

  const updateCourseMeta = async () => {
    if (!course || !editName.trim()) return;
    setBusy(true);
    try {
      await ovaelApi.updateCourse(course.course_id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      await refresh();
      setShowEditModal(false);
      setSuccessMsg("Course details updated successfully.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update course details",
      );
    } finally {
      setBusy(false);
    }
  };

  const deleteCurrentCourse = async () => {
    if (!course) return;
    setBusy(true);
    try {
      await ovaelApi.deleteCourse(course.course_id);
      await refresh();
      setCourseId("");
      setConfirmDelete(false);
      setSuccessMsg("Course deleted successfully.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete course",
      );
    } finally {
      setBusy(false);
    }
  };

  const enroll = async () => {
    if (!course || !learnerName.trim()) return;
    setBusy(true);
    try {
      await ovaelApi.enrollLearner(course.course_id, learnerName.trim());
      setLearnerName("");
      setLearners(await ovaelApi.teacherLearners(course.course_id));
      setSuccessMsg(`Enrolled "${learnerName.trim()}" in ${course.name}.`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Learner could not be enrolled",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUnenroll = async () => {
    if (!course || !unenrollTarget) return;
    setBusy(true);
    try {
      await ovaelApi.unenrollLearner(course.course_id, unenrollTarget.id);
      setLearners(await ovaelApi.teacherLearners(course.course_id));
      setSuccessMsg(
        `Learner "${unenrollTarget.username}" was removed from the cohort.`,
      );
      setUnenrollTarget(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not unenroll learner",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !course) return;
    setUploading(true);
    try {
      await ovaelApi.uploadDocument(file, course.course_id, false);
      await refresh();
      setSuccessMsg(`Material "${file.name}" uploaded to course library.`);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to upload document",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const propose = async () => {
    if (!course || !courseDocuments.length) return;
    setBusy(true);
    try {
      const obj =
        proposalObjective.trim() ||
        `Build a structured pedagogical graph for ${course.name}`;
      await ovaelApi.proposeGraph(
        course.course_id,
        courseDocuments.map((document) => document.document_id),
        obj,
      );
      setProposals(await ovaelApi.graphProposals(course.course_id));
      setShowProposeModal(false);
      setProposalObjective("");
      setTab("graph");
      setSuccessMsg("Curriculum knowledge graph proposed. Ready for educator review.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Graph proposal failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const approve = async (revisionId: string) => {
    if (!course) return;
    setBusy(true);
    try {
      await ovaelApi.approveGraph(course.course_id, revisionId);
      setProposals(await ovaelApi.graphProposals(course.course_id));
      setActiveGraph(await ovaelApi.activeCourseGraph(course.course_id));
      setSuccessMsg("Graph revision approved. Now authoritative for cohort learning.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Graph could not be approved",
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    courseName,
    setCourseName,
    subjectName,
    setSubjectName,
    learnerName,
    setLearnerName,
    busy,
    uploading,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    editName,
    setEditName,
    editDescription,
    setEditDescription,
    confirmDelete,
    setConfirmDelete,
    unenrollTarget,
    setUnenrollTarget,
    proposalObjective,
    setProposalObjective,
    showProposeModal,
    setShowProposeModal,
    createCourse,
    updateCourseMeta,
    deleteCurrentCourse,
    enroll,
    handleUnenroll,
    handleFileUpload,
    propose,
    approve,
  };
}
