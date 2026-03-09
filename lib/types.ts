export type Student = "Bahar" | "Leyla";

export type Role = Student | "Aile";

export type QuestionEntry = {
  id: number;
  student: Student;
  lesson: string;
  question_count: number;
  entry_date: string;
  created_at: string;
};
