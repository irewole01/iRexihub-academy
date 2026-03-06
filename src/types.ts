export interface Course {
  id: number;
  code: string;
  name: string;
  description: string;
}

export interface Material {
  id: number;
  course_id: number;
  title: string;
  type: 'pdf' | 'audio' | 'video' | 'practical' | 'note';
  url: string;
  description: string;
  created_at: string;
  course_name?: string;
  course_code?: string;
}

export type MaterialType = Material['type'];
