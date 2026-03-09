"use client";

import { Hash, BookOpen, Star, Award, SearchX, Loader2 } from "lucide-react";

export interface CourseResult {
  courseCode: string;
  courseName: string;
  credit: string;
  grade: string;
}

interface ResultTableProps {
  courses: CourseResult[];
  semesterId: number;
  isLoading: boolean;
  cgpa?: number;
}

const GRADE_THEMES: Record<string, string> = {
  S: "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20",
  A: "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20",
  "A+": "bg-blue-600 text-white shadow-sm",
  B: "bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20",
  "B+": "bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20",
  F: "bg-red-500 text-white shadow-md animate-pulse",
  DEFAULT:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700",
};

const GRADE_POINTS: Record<string, number> = {
  S: 10,
  "A+": 9,
  A: 8.5,
  "B+": 8,
  B: 7.5,
  "C+": 7,
  C: 6.5,
  D: 6,
  P: 5.5,
  F: 0,
  FE: 0,
  AB: 0,
};

function getGradeStyle(grade: string): string {
  return GRADE_THEMES[grade.toUpperCase()] ?? GRADE_THEMES.DEFAULT;
}

function calculateSGPA(courses: CourseResult[]) {
  let totalCredits = 0;
  let weightedPoints = 0;

  courses.forEach((course) => {
    const credit = parseFloat(course.credit) || 0;
    const gradePoint = GRADE_POINTS[course.grade.toUpperCase()] ?? 0;

    totalCredits += credit;
    weightedPoints += credit * gradePoint;
  });

  if (totalCredits === 0) return 0;

  return weightedPoints / totalCredits;
}

export function ResultTable({
  courses,
  semesterId,
  isLoading,
  cgpa,
}: ResultTableProps) {
  const totalCredits = courses.reduce(
    (sum, c) => sum + (parseFloat(c.credit) || 0),
    0
  );

  const sgpa = calculateSGPA(courses);

  if (isLoading) {
    return (
      <div className="flex h-112.5 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
          getting Records...
        </p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex h-100 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/20">
        <SearchX
          className="mb-4 text-slate-300 dark:text-slate-700"
          size={40}
        />
        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
          No records found
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Semester {semesterId} currently has no published results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 dark:border-slate-800 dark:bg-slate-900">
          <Award size={14} className="text-indigo-500" />
          <span className="text-[11px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">
            SGPA:{" "}
            <span className="text-slate-900 dark:text-white">
              {sgpa.toFixed(2)}
            </span>
          </span>
        </div>

        {cgpa !== undefined && (
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 dark:border-slate-800 dark:bg-slate-900">
            <Award size={14} className="text-indigo-500" />
            <span className="text-[11px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">
              CGPA:{" "}
              <span className="text-slate-900 dark:text-white">
                {cgpa.toFixed(2)}
              </span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 dark:border-slate-800 dark:bg-slate-900">
          <BookOpen size={14} className="text-indigo-500" />
          <span className="text-[11px] font-bold uppercase tracking-tight text-slate-600 dark:text-slate-400">
            Courses:{" "}
            <span className="text-slate-900 dark:text-white">
              {courses.length}
            </span>
          </span>
        </div>
      </div>

      {/* rest of your UI unchanged */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  <div className="flex items-center gap-2"><Hash size={12} /> Code</div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Course Detail
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Credits
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {courses.map((course, idx) => (
                <tr key={`${course.courseCode}-${idx}`} className="group hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    {course.courseCode}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {course.courseName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-medium text-slate-500">{course.credit}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex min-w-8 items-center justify-center rounded-md px-2 py-1 text-[11px] font-black tracking-tighter ${getGradeStyle(course.grade)}`}>
                      {course.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/20">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Performance Matrix</h4>
          <Star size={14} className="text-slate-300" />
        </div>
        <div className="flex gap-1.5 h-1.5 w-full">
          {courses.map((c, i) => (
            <div
              key={i}
              className={`h-full flex-1 rounded-full ${c.grade.startsWith('A') || c.grade === 'S' ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              title={`${c.courseName}: ${c.grade}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}