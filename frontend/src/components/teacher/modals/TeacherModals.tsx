import { CreateCourseModal } from "./CreateCourseModal";
import { EditCourseModal } from "./EditCourseModal";
import { DeleteCourseModal } from "./DeleteCourseModal";
import { UnenrollModal } from "./UnenrollModal";
import { ProposeGraphModal } from "./ProposeGraphModal";
import type { Course } from "../../../types";
import type { UnenrollTarget } from "../types";

export interface TeacherModalsProps {
  course: Course;
  courseDocumentsCount: number;
  busy: boolean;
  // Create Modal
  showCreateModal: boolean;
  courseName: string;
  subjectName: string;
  onCourseNameChange: (val: string) => void;
  onSubjectNameChange: (val: string) => void;
  onCloseCreateModal: () => void;
  onCreateCourse: () => void;
  // Edit Modal
  showEditModal: boolean;
  editName: string;
  editDescription: string;
  onEditNameChange: (val: string) => void;
  onEditDescriptionChange: (val: string) => void;
  onCloseEditModal: () => void;
  onUpdateCourseMeta: () => void;
  onDeleteClick: () => void;
  // Delete Modal
  confirmDelete: boolean;
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;
  // Unenroll Modal
  unenrollTarget: UnenrollTarget | null;
  onCloseUnenrollModal: () => void;
  onConfirmUnenroll: () => void;
  // Propose Modal
  showProposeModal: boolean;
  proposalObjective: string;
  onObjectiveChange: (val: string) => void;
  onCloseProposeModal: () => void;
  onPropose: () => void;
}

export function TeacherModals({
  course,
  courseDocumentsCount,
  busy,
  showCreateModal,
  courseName,
  subjectName,
  onCourseNameChange,
  onSubjectNameChange,
  onCloseCreateModal,
  onCreateCourse,
  showEditModal,
  editName,
  editDescription,
  onEditNameChange,
  onEditDescriptionChange,
  onCloseEditModal,
  onUpdateCourseMeta,
  onDeleteClick,
  confirmDelete,
  onCloseDeleteModal,
  onConfirmDelete,
  unenrollTarget,
  onCloseUnenrollModal,
  onConfirmUnenroll,
  showProposeModal,
  proposalObjective,
  onObjectiveChange,
  onCloseProposeModal,
  onPropose,
}: TeacherModalsProps) {
  return (
    <>
      {/* MODAL: CREATE CLASS COURSE */}
      <CreateCourseModal
        isOpen={showCreateModal}
        courseName={courseName}
        subjectName={subjectName}
        busy={busy}
        onCourseNameChange={onCourseNameChange}
        onSubjectNameChange={onSubjectNameChange}
        onClose={onCloseCreateModal}
        onSubmit={onCreateCourse}
      />

      {/* MODAL: EDIT COURSE DETAILS */}
      <EditCourseModal
        isOpen={showEditModal}
        editName={editName}
        editDescription={editDescription}
        busy={busy}
        onEditNameChange={onEditNameChange}
        onEditDescriptionChange={onEditDescriptionChange}
        onClose={onCloseEditModal}
        onSubmit={onUpdateCourseMeta}
        onDeleteClick={onDeleteClick}
      />

      {/* MODAL: CONFIRM DELETE COURSE */}
      <DeleteCourseModal
        isOpen={confirmDelete}
        courseName={course.name}
        busy={busy}
        onClose={onCloseDeleteModal}
        onConfirm={onConfirmDelete}
      />

      {/* MODAL: CONFIRM UNENROLL STUDENT */}
      <UnenrollModal
        target={unenrollTarget}
        courseName={course.name}
        busy={busy}
        onClose={onCloseUnenrollModal}
        onConfirm={onConfirmUnenroll}
      />

      {/* MODAL: PROPOSE GRAPH */}
      <ProposeGraphModal
        isOpen={showProposeModal}
        courseDocumentsCount={courseDocumentsCount}
        courseName={course.name}
        proposalObjective={proposalObjective}
        busy={busy}
        onObjectiveChange={onObjectiveChange}
        onClose={onCloseProposeModal}
        onSubmit={onPropose}
      />
    </>
  );
}
