export interface Course {
  course_id: string;
  name: string;
  subject_id?: string;
  subject_name?: string;
  description?: string;
  course_kind?: 'personal' | 'class' | string;
  created_at?: string;
  updated_at?: string;
  membership?: 'owner' | 'learner' | string;
  owner_user_id?: string;
}

export interface Concept {
  concept_id: string;
  name: string;
}

export type CourseSort = 'updated' | 'name' | 'created';
export type CourseFilter = 'all' | 'personal' | 'class';
