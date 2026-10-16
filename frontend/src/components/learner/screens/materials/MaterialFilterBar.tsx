import { LayoutGrid, List, Search, X } from "lucide-react";
import type { Course } from "../../../../types";

interface MaterialFilterBarProps {
  query: string;
  onQueryChange: (val: string) => void;
  typeFilter: "all" | "doc" | "image" | "media";
  onTypeFilterChange: (val: "all" | "doc" | "image" | "media") => void;
  statusFilter: "all" | "ready" | "review";
  onStatusFilterChange: (val: "all" | "ready" | "review") => void;
  readyCount: number;
  reviewCount: number;
  courses: Course[];
  selectedCourseFilter: string;
  onCourseFilterChange: (val: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (val: "grid" | "list") => void;
}

export function MaterialFilterBar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  readyCount,
  reviewCount,
  courses,
  selectedCourseFilter,
  onCourseFilterChange,
  viewMode,
  onViewModeChange,
}: MaterialFilterBarProps) {
  return (
    <section className="materials-toolbar-bar" aria-label="Library filters">
      <div className="toolbar-search-box">
        <Search size={16} className="search-icon" />
        <input
          type="search"
          aria-label="Search your materials"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search files by title, subject domain, or topic concept…"
          className="search-input"
        />
        {query && (
          <button
            type="button"
            className="icon-button clear-btn"
            onClick={() => onQueryChange("")}
            aria-label="Clear search query"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="toolbar-filters-row">
        {/* File Type Filter */}
        <div className="filter-pill-group" role="radiogroup" aria-label="File format filter">
          <button
            type="button"
            className={`filter-pill-btn ${typeFilter === "all" ? "active" : ""}`}
            onClick={() => onTypeFilterChange("all")}
          >
            All Types
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${typeFilter === "doc" ? "active" : ""}`}
            onClick={() => onTypeFilterChange("doc")}
          >
            Documents
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${typeFilter === "image" ? "active" : ""}`}
            onClick={() => onTypeFilterChange("image")}
          >
            Images (OCR)
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${typeFilter === "media" ? "active" : ""}`}
            onClick={() => onTypeFilterChange("media")}
          >
            Audio & Video
          </button>
        </div>

        {/* Status Filter */}
        <div className="filter-pill-group" role="radiogroup" aria-label="Status filter">
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => onStatusFilterChange("all")}
          >
            All Status
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === "ready" ? "active" : ""}`}
            onClick={() => onStatusFilterChange("ready")}
          >
            Ready ({readyCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === "review" ? "active" : ""}`}
            onClick={() => onStatusFilterChange("review")}
          >
            Review ({reviewCount})
          </button>
        </div>

        {/* Course Scope Filter */}
        {courses.length > 0 && (
          <select
            aria-label="Filter by course"
            value={selectedCourseFilter}
            onChange={(e) => onCourseFilterChange(e.target.value)}
            className="course-filter-dropdown"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {/* View Mode Toggle */}
        <div className="view-mode-toggle" role="group" aria-label="View layout mode">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => onViewModeChange("grid")}
            aria-label="Grid view"
            title="Grid view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => onViewModeChange("list")}
            aria-label="List view"
            title="List view"
          >
            <List size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
