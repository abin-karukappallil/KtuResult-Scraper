import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Table } from "jspdf-autotable";
import type { CourseResult } from "./ktuScraprt";

interface ExportPdfOptions {
  courses: CourseResult[];
  semesterId: number;
  sgpa: string;
  totalCredits: number;
}

export function exportGradeCardToPdf({
  courses,
  semesterId,
  sgpa,
  totalCredits,
}: ExportPdfOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 15, 14);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(200, 169, 107);
  doc.text("ACADEMIC EXAMINATION PORTAL", 14, 11);

  doc.setFontSize(14);
  doc.setTextColor(242, 239, 232);
  doc.text(`SEMESTER ${semesterId} GRADE CARD`, 14, 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(168, 163, 154);
  const now = new Date().toLocaleString();
  doc.text(`Generated: ${now}`, pageWidth - 14, 19, { align: "right" });

  doc.setFillColor(245, 244, 240);
  doc.roundedRect(14, 34, pageWidth - 28, 18, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(113, 109, 100);
  doc.text("ACADEMIC SEMESTER", 18, 40);
  doc.text("CALCULATED SGPA", 75, 40);
  doc.text("TOTAL CREDITS", 125, 40);
  doc.text("ACADEMIC STATUS", 165, 40);

  const failCount = courses.filter(
    (c) =>
      c.grade.toUpperCase() === "F" ||
      c.grade.toUpperCase() === "FE" ||
      c.grade.toUpperCase() === "AB"
  ).length;

  doc.setFontSize(11);
  doc.setTextColor(24, 24, 27);
  doc.text(`S${semesterId}`, 18, 47);

  doc.setTextColor(180, 130, 40);
  doc.text(sgpa, 75, 47);

  doc.setTextColor(24, 24, 27);
  doc.text(totalCredits.toFixed(1), 125, 47);

  if (failCount === 0) {
    doc.setTextColor(5, 150, 105);
    doc.text("ALL CLEAR", 165, 47);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(`${failCount} BACKLOG${failCount > 1 ? "S" : ""}`, 165, 47);
  }

  const tableRows = courses.map((course) => [
    course.courseCode,
    course.courseName,
    course.credit,
    course.grade,
  ]);

  autoTable(doc, {
    startY: 58,
    head: [["Course Code", "Course Title", "Credits", "Grade"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [19, 19, 17],
      textColor: [242, 239, 232],
      fontSize: 9,
      fontStyle: "bold",
      halign: "left",
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 30, 30],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 246],
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 22, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const grade = String(data.cell.raw).trim().toUpperCase();
        if (grade === "F" || grade === "FE" || grade === "AB") {
          data.cell.styles.textColor = [220, 38, 38];
        } else if (grade === "S" || grade === "A+" || grade === "A") {
          data.cell.styles.textColor = [5, 150, 105];
        } else {
          data.cell.styles.textColor = [37, 99, 235];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: Table }).lastAutoTable?.finalY ?? 200;
  const advisoryY = Math.min(finalY + 10, doc.internal.pageSize.getHeight() - 30);

  doc.setFillColor(250, 249, 246);
  doc.setDrawColor(200, 169, 107);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, advisoryY, pageWidth - 28, 18, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(180, 130, 40);
  doc.text("OFFICIAL PORTAL VERIFICATION ADVISORY", 18, advisoryY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  const disclaimerText =
    "This grade card was compiled via the Academic Proxy to reduce gateway timeout during peak result release. " +
    "Official transcripts and marks should always be cross-checked against the official student portal after server traffic normalizes.";
  const splitText = doc.splitTextToSize(disclaimerText, pageWidth - 36);
  doc.text(splitText, 18, advisoryY + 10);

  doc.save(`Semester_${semesterId}_GradeCard.pdf`);
}
