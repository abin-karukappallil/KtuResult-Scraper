import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import * as React from "react";
import ResultEmailTemplate from "@/emails/ResultEmailTemplate";
import type { CourseResult } from "@/lib/ktuScraprt";

export interface SendResultEmailInput {
  to: string;
  semesterId: number;
  courses: CourseResult[];
  sgpa?: string;
  sourceMode?: "live_watcher" | "background_cron";
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  console.log(
    "[EMAIL] No SMTP credentials found (SMTP_HOST, SMTP_USER, SMTP_PASS). Using simulated console transport."
  );
  return null;
}

export async function sendResultNotificationEmail(
  input: SendResultEmailInput
): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const { to, semesterId, courses, sgpa, sourceMode } = input;

  console.log(`[EMAIL] Generating email for ${to} (Semester ${semesterId})...`);

  const emailHtml = await render(
    React.createElement(ResultEmailTemplate, {
      semesterId,
      courses,
      sgpa,
      sourceMode,
    })
  );

  const transporter = getTransporter();

  if (!transporter) {
    console.log(
      `[EMAIL SIMULATION] Result email generated successfully for ${to}.\n` +
      `Subject: Semester ${semesterId} Results Released! (SGPA: ${sgpa ?? "N/A"})\n` +
      `Courses count: ${courses.length}`
    );
    return {
      success: true,
      simulated: true,
    };
  }

  const fromAddress =
    process.env.SMTP_FROM || '"Academic Result Watcher" <notifier@academicportal.local>';

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject: `Semester ${semesterId} Results Released! (SGPA: ${sgpa ?? "N/A"})`,
    html: emailHtml,
  });

  console.log(`[EMAIL] Result email delivered to ${to}. Message ID: ${info.messageId}`);
  return {
    success: true,
    messageId: info.messageId,
  };
}
