export interface StudentRecordItem {
  id: string;
  grade: string;
  type: string;
  subject: string;
  text: string;
  tags: string[];
  highlightSpans?: string[];
  highlights?: string[];
}

export type CompetencyType = 'academic' | 'career' | 'community' | 'university';

export interface QuestionItem {
  id: string;
  competency: CompetencyType;
  type: 'record' | 'deep' | 'pressure' | 'university';
  grade?: string;
  subject?: string;
  highlightText?: string;
  question: string;
  intent: string;
  points: string[];
  followUps: string[];
  defense?: string;
  userNotes?: string;
  completed?: boolean;
  starred?: boolean;
  isCommon?: boolean;
  srcBadge?: string;
  catGroup?: 'univ_q' | 'cases' | 'qb' | 'record' | 'common' | 'fusion' | 'past';
  tplId?: string;
  ansLabel?: string;
  tip?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  targetUniversity: string;
  targetMajor: string;
  interviewType: string;
  interviewDate?: string;
  createdAt: string;
  records: StudentRecordItem[];
  questions: QuestionItem[];
  customKeywords?: string[];
}

export interface ApiKeys {
  gemini: string;
  openai?: string;
  claude?: string;
  activeProvider: 'gemini' | 'openai' | 'claude';
}
