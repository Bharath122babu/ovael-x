import { Search, X } from "lucide-react";

export interface CourseFilterBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filterKind: "all" | "personal" | "class";
  onFilterKindChange: (kind: "all" | "personal" | "class") => void;
  sortBy: "name" | "topics" | "materials";
  onSortByChange: (sort: "name" | "topics" | "materials") => void;
  totalCoursesCount: number;
  personalCoursesCount: number;
  classCoursesCount: number;
}

export function CourseFilterBar({
  searchQuery,
  onSearchQueryChange,
  filterKind,
  onFilterKindChange,
  sortBy,
  onSortByChange,
  totalCoursesCount,
  personalCoursesCount,
  classCoursesCount,
}: CourseFilterBarProps) {
  return (
    <section className="courses-filter-bar" aria-label="Course filters">
      <div className="filter-search-wrap">
        <Search size={16} className="search-icon" />
        <input
          type="search"
          aria-label="Search your courses"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search by course title, subject domain, or objectives…"
          className="filter-search-input"
        />
        {searchQuery && (
          <button
            type="button"
            className="icon-button clear-search-btn"
            onClick={() => onSearchQueryChange("")}
            aria-label="Clear search query"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="filter-actions-group">
        {/* Filter Kind Pills */}
        <div className="filter-pill-group" role="radiogroup" aria-label="Course type filter">
          <button
            type="button"
            className={`filter-pill-btn ${filterKind === "all" ? "active" : ""}`}
            onClick={() => onFilterKindChange("all")}
          >
            All Courses ({totalCoursesCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterKind === "personal" ? "active" : ""}`}
            onClick={() => onFilterKindChange("personal")}
          >
            Personal ({personalCoursesCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterKind === "class" ? "active" : ""}`}
            onClick={() => onFilterKindChange("class")}
          >
            Class ({classCoursesCount})
          </button>
        </div>

        {/* Sort By Dropdown */}
        <label className="sort-select-wrap">
          <span className="sort-label">Sort:</span>
          <select
            aria-label="Sort courses by"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as "name" | "topics" | "materials")}
            className="sort-dropdown"
          >
            <option value="name">Alphabetical (A–Z)</option>
            <option value="topics">Topic Count</option>
            <option value="materials">Materials Attached</option>
          </select>
        </label>
      </div>
    </section>
  );
}
