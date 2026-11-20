import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
  Font,
} from "@react-email/components";
import type { CourseResult } from "@/lib/ktuScraprt";

interface ResultEmailTemplateProps {
  semesterId: number;
  courses: CourseResult[];
  sgpa?: string;
  sourceMode?: "live_watcher" | "background_cron";
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

function getGradeBadgeStyle(grade: string): React.CSSProperties {
  const g = grade.trim().toUpperCase();
  if (g === "S" || g === "A+" || g === "A") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      backgroundColor: "rgba(0, 212, 146, 0.08)",
      color: "#00D492",
      border: "1px solid rgba(0, 212, 146, 0.25)",
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
      fontSize: "11px",
    };
  }
  if (g === "B+" || g === "B") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      backgroundColor: "rgba(77, 107, 254, 0.08)",
      color: "#4D6BFE",
      border: "1px solid rgba(77, 107, 254, 0.25)",
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
      fontSize: "11px",
    };
  }
  if (g === "C+" || g === "C" || g === "D" || g === "P") {
    return {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "4px",
      backgroundColor: "#161614",
      color: "#A8A39A",
      border: "1px solid rgba(244, 244, 233, 0.10)",
      fontWeight: 700,
      fontFamily: "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
      fontSize: "11px",
    };
  }
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 92, 92, 0.08)",
    color: "#FF5C5C",
    border: "1px solid rgba(255, 92, 92, 0.25)",
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace",
    fontSize: "11px",
  };
}

export const ResultEmailTemplate = ({
  semesterId = 1,
  courses = [],
  sgpa = "N/A",
  sourceMode = "background_cron",
}: ResultEmailTemplateProps) => {
  const totalCredits = courses.reduce(
    (sum, c) => sum + (parseFloat(c.credit) || 0),
    0
  );

  const effectiveSgpa = sgpa && sgpa !== "N/A" ? sgpa : calculateSGPA(courses);

  const failCount = courses.filter(
    (c) =>
      c.grade.toUpperCase() === "F" ||
      c.grade.toUpperCase() === "FE" ||
      c.grade.toUpperCase() === "AB"
  ).length;

  const previewText = `Semester ${semesterId} Grade Card Released. SGPA: ${effectiveSgpa} | Status: ${failCount === 0 ? "ALL CLEAR" : `${failCount} BACKLOG${failCount > 1 ? "S" : ""}`}`;

  return (
    <Html>
      <Head>
        <Font
          fontFamily="Tomorrow"
          fallbackFontFamily="sans-serif"
          webFont={{
            url: "https://fonts.gstatic.com/s/tomorrow/v17/WBLxrw2Tx-x8E8W1ugWp_78.woff2",
            format: "woff2",
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={eyebrow}>ACADEMIC EXAMINATION PORTAL</Text>
            <Heading style={title}>
              Semester {semesterId} Grade Records
            </Heading>
            <Text style={subtitle}>
              Your KTU semester results are available.
            </Text>
          </Section>

          <Section style={metricsSection}>
            <Row>
              <Column style={metricCol}>
                <div style={metricCard}>
                  <Text style={metricLabelGold}>Calculated SGPA</Text>
                  <Text style={metricValue}>{effectiveSgpa}</Text>
                </div>
              </Column>
              <Column style={metricCol}>
                <div style={metricCard}>
                  <Text style={metricLabelMuted}>Total Credits</Text>
                  <Text style={metricValue}>{totalCredits.toFixed(1)}</Text>
                </div>
              </Column>
              <Column style={metricCol}>
                <div style={metricCard}>
                  <Text style={metricLabelMuted}>Academic Status</Text>
                  <Text
                    style={
                      failCount === 0 ? metricStatusClear : metricStatusFail
                    }
                  >
                    {failCount === 0
                      ? "ALL CLEAR"
                      : `${failCount} BACKLOG${failCount > 1 ? "S" : ""}`}
                  </Text>
                </div>
              </Column>
            </Row>
          </Section>

          <Section style={tableSection}>
            <div style={tableHeaderBar}>
              <Text style={tableBarTitle}>
                Semester {semesterId} Grade Card ({courses.length} courses)
              </Text>
            </div>
            <table style={table}>
              <thead>
                <tr style={tableHeaderRow}>
                  <th style={{ ...tableHeaderCell, width: "22%" }}>Code</th>
                  <th style={{ ...tableHeaderCell, width: "48%" }}>Course Title</th>
                  <th style={{ ...tableHeaderCell, width: "15%", textAlign: "center" }}>
                    Credits
                  </th>
                  <th style={{ ...tableHeaderCell, width: "15%", textAlign: "right" }}>
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, idx) => (
                  <tr
                    key={idx}
                    style={idx % 2 === 0 ? tableRowEven : tableRowOdd}
                  >
                    <td style={tableCellCode}>{course.courseCode}</td>
                    <td style={tableCellName}>{course.courseName}</td>
                    <td style={{ ...tableCell, textAlign: "center" }}>
                      {course.credit}
                    </td>
                    <td style={{ ...tableCell, textAlign: "right" }}>
                      <span style={getGradeBadgeStyle(course.grade)}>
                        {course.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Hr style={divider} />

          <Section style={securitySection}>
            <Text style={securityEyebrow}>Security Architecture & Retention Policy</Text>
            <Text style={securityText}>
              {sourceMode === "background_cron"
                ? "Your background watcher found these results using your KTU session."
                : "Your live browser watcher found these results using your KTU session."}
            </Text>
            <Text style={securityText}>
              Open-source verification & encryption lifecycle source code:
            </Text>
            <Link
              href="https://github.com/abin-karukappallil/KtuResult-Scraper"
              style={githubLink}
            >
              github.com/abin-karukappallil/KtuResult-Scraper
            </Link>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              Source: Student Academic Examination Portal (app.ktu.edu.in)
            </Text>
            <Text style={footerSub}>
              Automated grade notification
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ResultEmailTemplate;

const main: React.CSSProperties = {
  backgroundColor: "#0F0F0E",
  fontFamily:
    "'Tomorrow', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: "36px 12px",
  color: "#F2EFE8",
};

const container: React.CSSProperties = {
  backgroundColor: "#131311",
  border: "1px solid rgba(244, 244, 233, 0.08)",
  borderTop: "2px solid #C8A96B",
  borderRadius: "8px",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "32px 24px",
};

const header: React.CSSProperties = {
  marginBottom: "24px",
};

const eyebrow: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.18em",
  color: "#C8A96B",
  textTransform: "uppercase",
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  margin: "0 0 8px 0",
};

const title: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
  color: "#F2EFE8",
  fontFamily: "'Tomorrow', 'Inter', sans-serif",
  margin: "0 0 8px 0",
  letterSpacing: "-0.01em",
};

const subtitle: React.CSSProperties = {
  fontSize: "13px",
  color: "#A8A39A",
  lineHeight: "1.6",
  margin: "0",
  fontFamily: "'Inter', sans-serif",
};

const metricsSection: React.CSSProperties = {
  marginBottom: "24px",
};

const metricCol: React.CSSProperties = {
  padding: "0 4px",
};

const metricCard: React.CSSProperties = {
  backgroundColor: "#161614",
  border: "1px solid rgba(244, 244, 233, 0.08)",
  borderRadius: "6px",
  padding: "12px 10px",
  textAlign: "center",
};

const metricLabelGold: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.14em",
  color: "#C8A96B",
  textTransform: "uppercase",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "0 0 6px 0",
};

const metricLabelMuted: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  letterSpacing: "0.14em",
  color: "#716D64",
  textTransform: "uppercase",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "0 0 6px 0",
};

const metricValue: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
  color: "#F2EFE8",
  fontFamily: "'Tomorrow', sans-serif",
  margin: "0",
};

const metricStatusClear: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#00D492",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "6px 0 0 0",
  letterSpacing: "0.06em",
};

const metricStatusFail: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#FF5C5C",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "6px 0 0 0",
  letterSpacing: "0.06em",
};

const tableSection: React.CSSProperties = {
  marginBottom: "24px",
  border: "1px solid rgba(244, 244, 233, 0.08)",
  borderRadius: "6px",
  overflow: "hidden",
};

const tableHeaderBar: React.CSSProperties = {
  backgroundColor: "#161614",
  borderBottom: "1px solid rgba(244, 244, 233, 0.08)",
  padding: "10px 14px",
};

const tableBarTitle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  color: "#F2EFE8",
  textTransform: "uppercase",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "0",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
  backgroundColor: "#131311",
};

const tableHeaderRow: React.CSSProperties = {
  backgroundColor: "rgba(22, 22, 20, 0.7)",
  borderBottom: "1px solid rgba(244, 244, 233, 0.08)",
};

const tableHeaderCell: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontSize: "10px",
  fontWeight: 600,
  color: "#716D64",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontFamily: "'JetBrains Mono', monospace",
};

const tableRowEven: React.CSSProperties = {
  backgroundColor: "#131311",
};

const tableRowOdd: React.CSSProperties = {
  backgroundColor: "#161614",
};

const tableCell: React.CSSProperties = {
  padding: "10px 12px",
  color: "#A8A39A",
  fontSize: "12px",
  borderBottom: "1px solid rgba(244, 244, 233, 0.05)",
  fontFamily: "'Inter', sans-serif",
};

const tableCellCode: React.CSSProperties = {
  ...tableCell,
  fontWeight: 600,
  fontFamily: "'JetBrains Mono', monospace",
  color: "#F2EFE8",
  fontSize: "11px",
};

const tableCellName: React.CSSProperties = {
  ...tableCell,
  color: "#A8A39A",
};

const divider: React.CSSProperties = {
  borderColor: "rgba(244, 244, 233, 0.08)",
  margin: "24px 0",
};

const securitySection: React.CSSProperties = {
  backgroundColor: "#161614",
  border: "1px solid rgba(244, 244, 233, 0.08)",
  borderRadius: "6px",
  padding: "16px",
  marginBottom: "16px",
};

const securityEyebrow: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.14em",
  color: "#C8A96B",
  textTransform: "uppercase",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "0 0 6px 0",
};

const securityText: React.CSSProperties = {
  fontSize: "11px",
  color: "#A8A39A",
  lineHeight: "1.6",
  margin: "0 0 8px 0",
  fontFamily: "'Inter', sans-serif",
};

const githubLink: React.CSSProperties = {
  fontSize: "11px",
  color: "#C8A96B",
  textDecoration: "underline",
  fontFamily: "'JetBrains Mono', monospace",
};

const footer: React.CSSProperties = {
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  fontSize: "11px",
  color: "#716D64",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "0 0 4px 0",
};

const footerSub: React.CSSProperties = {
  fontSize: "10px",
  color: "#525250",
  fontFamily: "'JetBrains Mono', monospace",
  margin: "0",
};
