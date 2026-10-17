import { useRef } from "react";
import { FileText, GitBranch, LoaderCircle, Search, Upload } from "lucide-react";
import type { DocumentRecord } from "../../../types";

export interface TeacherMaterialsTabProps {
  courseDocumentsCount: number;
  filteredDocuments: DocumentRecord[];
  courseSubjectName?: string;
  materialsQuery: string;
  uploading: boolean;
  busy: boolean;
  onMaterialsQueryChange: (val: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProposeModalOpen: () => void;
}

export function TeacherMaterialsTab({
  courseDocumentsCount,
  filteredDocuments,
  courseSubjectName,
  materialsQuery,
  uploading,
  busy,
  onMaterialsQueryChange,
  onFileUpload,
  onProposeModalOpen,
}: TeacherMaterialsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="teacher-card-elevated teacher-tab-content">
      <div className="section-toolbar-header">
        <div>
          <span className="eyebrow-accent">Curriculum Materials</span>
          <h2>Course Library ({courseDocumentsCount})</h2>
          <p>
            Uploaded syllabus materials serve as ground truth for AI learning
            synthesis, concept extraction, and assessment question generation.
          </p>
        </div>

        <div className="toolbar-button-group">
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={onFileUpload}
          />
          <button
            type="button"
            className="secondary-button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
            Upload Material
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={courseDocumentsCount === 0 || busy}
            onClick={onProposeModalOpen}
          >
            <GitBranch size={16} /> Propose Graph
          </button>
        </div>
      </div>

      {/* Search Materials */}
      <div className="table-search-bar">
        <div className="input-with-icon">
          <Search size={16} className="field-icon" />
          <input
            value={materialsQuery}
            onChange={(e) => onMaterialsQueryChange(e.target.value)}
            placeholder="Search course materials..."
          />
        </div>
        {materialsQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => onMaterialsQueryChange("")}
          >
            Clear
          </button>
        )}
      </div>

      {/* Materials Table */}
      <div className="teacher-data-table-wrap">
        <table className="teacher-data-table" aria-label="Course documents table">
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">Status</th>
              <th scope="col">Size</th>
              <th scope="col">Uploaded</th>
              <th scope="col">Focus Subject</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((doc) => {
              const sizeKb = Math.round(doc.size_bytes / 1024);
              const isReady = doc.status === "ready";
              return (
                <tr key={doc.document_id}>
                  <td>
                    <div className="file-cell">
                      <FileText size={18} className="file-cell-icon" />
                      <div>
                        <strong>{doc.filename}</strong>
                        <small className="muted-id">ID: {doc.document_id.slice(0, 8)}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`badge-status-${isReady ? "active" : "pending"}`}
                    >
                      {doc.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span>{sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`}</span>
                  </td>
                  <td>
                    <span className="date-cell">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span className="subject-tag">
                      {doc.subject_name || courseSubjectName || "Course Core"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDocuments.length === 0 && (
          <div className="table-empty-notice">
            {materialsQuery ? (
              `No materials matching "${materialsQuery}".`
            ) : (
              <div>
                <p>No materials assigned to this course yet.</p>
                <button
                  type="button"
                  className="primary-button compact"
                  style={{ marginTop: "12px" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={15} /> Upload First Syllabus Material
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
