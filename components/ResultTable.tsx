"use client";

import { Copy, Check, FileDown, AlertCircle } from "lucide-react";
import { useState } from "react";
import { exportGradeCardToPdf } from "@/lib/pdfExport";

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

function getGradeBadge(grade: string) {
  const g = grade.trim().toUpperCase();
  if (g === "S" || g === "A+" || g === "A") {
    return "text-[#00D492] border-[#00D492]/25 bg-[#00D492]/[0.06]";
  }
  if (g === "B+" || g === "B") {
    return "text-[#4D6BFE] border-[#4D6BFE]/25 bg-[#4D6BFE]/[0.06]";
  }
  if (g === "C+" || g === "C" || g === "D" || g === "P") {
    return "text-[#A8A39A] border-[#F4F4E9]/[0.10] bg-[#161614]";
  }
  return "text-[#FF5C5C] border-[#FF5C5C]/25 bg-[#FF5C5C]/[0.06]";
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

  if (totalCredits === 0) return "0.00";
  return (weightedPoints / totalCredits).toFixed(2);
}

export function ResultTable({
  courses,
  semesterId,
  isLoading,
}: ResultTableProps) {
  const [copied, setCopied] = useState(false);

  const totalCredits = courses.reduce(
    (sum, c) => sum + (parseFloat(c.credit) || 0),
    0
  );

  const sgpa = calculateSGPA(courses);
  const failCount = courses.filter(
    (c) =>
      c.grade.toUpperCase() === "F" ||
      c.grade.toUpperCase() === "FE" ||
      c.grade.toUpperCase() === "AB"
  ).length;

  const handleCopy = () => {
    const text = courses
      .map((c) => `${c.courseCode} - ${c.courseName}: ${c.grade} (${c.credit} credits)`)
      .join("\n");
    const summary = `Semester ${semesterId} Results\nSGPA: ${sgpa}\nTotal Credits: ${totalCredits}\n\n${text}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center border border-[#F4F4E9]/[0.08] rounded bg-[#131311]">
        <div className="w-4 h-4 border-2 border-[#716D64] border-t-[#C8A96B] rounded-full animate-spin" />
        <span className="mt-3 text-xs text-[#A8A39A] font-mono uppercase tracking-[0.14em]">
          Parsing University Grade Card...
        </span>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-[#F4F4E9]/[0.10] rounded bg-[#131311]">
        <p className="text-sm font-medium text-[#F2EFE8]">
          No published records found
        </p>
        <p className="mt-1 text-xs text-[#716D64] font-mono">
          Semester {semesterId} has no declared results for this account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded border border-[#F4F4E9]/[0.08] bg-[#131311]">
          <span className="text-[10px] uppercase font-mono tracking-[0.16em] text-[#C8A96B] block mb-1">
            Calculated SGPA
          </span>
          <span className="text-3xl font-semibold font-display tracking-tight text-[#F2EFE8]">
            {sgpa}
          </span>
        </div>

        <div className="p-4 rounded border border-[#F4F4E9]/[0.08] bg-[#131311]">
          <span className="text-[10px] uppercase font-mono tracking-[0.16em] text-[#716D64] block mb-1">
            Total Credits
          </span>
          <span className="text-3xl font-semibold font-display tracking-tight text-[#F2EFE8]">
            {totalCredits.toFixed(1)}
          </span>
        </div>

        <div className="p-4 rounded border border-[#F4F4E9]/[0.08] bg-[#131311]">
          <span className="text-[10px] uppercase font-mono tracking-[0.16em] text-[#716D64] block mb-1">
            Courses Graded
          </span>
          <span className="text-3xl font-semibold font-display tracking-tight text-[#F2EFE8]">
            {courses.length}
          </span>
        </div>

        <div className="p-4 rounded border border-[#F4F4E9]/[0.08] bg-[#131311]">
          <span className="text-[10px] uppercase font-mono tracking-[0.16em] text-[#716D64] block mb-1">
            Status
          </span>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${
                failCount === 0 ? "bg-[#00D492]" : "bg-[#FF5C5C]"
              }`}
            />
            <span
              className={`text-sm font-semibold font-mono tracking-tight ${
                failCount === 0 ? "text-[#00D492]" : "text-[#FF5C5C]"
              }`}
            >
              {failCount === 0 ? "ALL CLEAR" : `${failCount} BACKLOG${failCount > 1 ? "S" : ""}`}
            </span>
          </div>
        </div>
      </div>

      <div className="border border-[#F4F4E9]/[0.08] rounded overflow-hidden bg-[#131311]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F4F4E9]/[0.08] bg-[#161614]">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-mono tracking-[0.14em] text-[#F2EFE8]">
              Semester {semesterId} Grade Card
            </span>
            <span className="text-[10px] font-mono text-[#716D64]">
              ({courses.length} records)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-[#A8A39A] hover:text-[#F2EFE8] transition-colors font-mono px-2 py-1 rounded bg-[#131311] border border-[#F4F4E9]/[0.08]"
            >
              {copied ? <Check size={12} className="text-[#00D492]" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportGradeCardToPdf({
                  courses,
                  semesterId,
                  sgpa,
                  totalCredits,
                })
              }
              className="flex items-center gap-1.5 text-xs text-[#C8A96B] hover:text-[#e4cf9b] transition-colors font-mono px-2.5 py-1 rounded bg-[#131311] border border-[#C8A96B]/30 hover:border-[#C8A96B]/60 shadow-[inset_0_1px_0_0_#C8A96B]/20"
            >
              <FileDown size={12} className="text-[#C8A96B]" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F4F4E9]/[0.08] bg-[#161614]/70 text-[#716D64] font-mono uppercase tracking-[0.12em]">
                <th className="py-2.5 px-4 font-medium text-[10px]">Code</th>
                <th className="py-2.5 px-4 font-medium text-[10px]">Course Title</th>
                <th className="py-2.5 px-4 text-center font-medium text-[10px]">Credits</th>
                <th className="py-2.5 px-4 text-right font-medium text-[10px]">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F4E9]/[0.05]">
              {courses.map((course, idx) => (
                <tr
                  key={`${course.courseCode}-${idx}`}
                  className="hover:bg-[#161614]/50 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-medium text-[#F2EFE8]">
                    {course.courseCode}
                  </td>
                  <td className="py-3 px-4 text-[#A8A39A]">
                    {course.courseName}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[#716D64]">
                    {course.credit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold border ${getGradeBadge(
                        course.grade
                      )}`}
                    >
                      {course.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3.5 rounded border border-[#F4F4E9]/[0.08] bg-[#131311] flex items-start gap-3">
        <AlertCircle size={14} className="text-[#C8A96B] shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs">
          <span className="font-mono uppercase tracking-[0.14em] text-[10px] text-[#C8A96B] font-medium block">
            Official Portal Verification Advisory
          </span>
          <p className="text-[11px] text-[#716D64] font-mono leading-relaxed">
            This proxy extracts published results to bypass gateway congestion during peak result release. Always verify your official grades and marks on the university portal (
            <a
              href="https://app.ktu.edu.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C8A96B] hover:text-[#e4cf9b] underline transition-colors"
            >
              app.ktu.edu.in
            </a>
            ) once traffic rush subsides.
          </p>
        </div>
      </div>
    </div>
  );
}
