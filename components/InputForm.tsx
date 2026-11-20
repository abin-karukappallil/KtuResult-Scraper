"use client";

import { useState } from "react";
import {
  Loader2,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

export type FormMode = "instant" | "live_watcher" | "background_watcher";

export interface FormValues {
  sessionToken: string;
  semesterId: number;
  studentId?: string;
  mode: FormMode;
  email?: string;
  intervalMinutes?: number;
}

interface InputFormProps {
  onSubmit: (values: FormValues) => void;
  isLoading: boolean;
  onSemesterChange?: (semesterId: number) => void;
}

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function InputForm({
  onSubmit,
  isLoading,
  onSemesterChange,
}: InputFormProps) {
  const [sessionToken, setSessionToken] = useState("");
  const [semesterId, setSemesterId] = useState<number>(1);
  const [studentId, setStudentId] = useState("");

  const [activeTab, setActiveTab] = useState<"lookup" | "watcher">("lookup");
  const [watcherType, setWatcherType] = useState<"live_watcher" | "background_watcher">("live_watcher");
  const [email, setEmail] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState<number>(15);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken.trim()) return;

    const mode: FormMode = activeTab === "lookup" ? "instant" : watcherType;
    if (mode !== "instant" && !email.trim()) return;

    onSubmit({
      sessionToken: sessionToken.trim(),
      semesterId,
      studentId: studentId.trim(),
      mode,
      email: email.trim(),
      intervalMinutes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex border-b border-[#F4F4E9]/[0.08]">
        <button
          type="button"
          onClick={() => setActiveTab("lookup")}
          className={`flex-1 pb-3 text-xs uppercase font-mono tracking-[0.14em] font-medium transition-all ${
            activeTab === "lookup"
              ? "text-[#F2EFE8] border-b-2 border-[#C8A96B]"
              : "text-[#A8A39A] hover:text-[#F2EFE8] border-b-2 border-transparent"
          }`}
        >
          Direct Result Lookup
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("watcher")}
          className={`flex-1 pb-3 text-xs uppercase font-mono tracking-[0.14em] font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === "watcher"
              ? "text-[#F2EFE8] border-b-2 border-[#C8A96B]"
              : "text-[#A8A39A] hover:text-[#F2EFE8] border-b-2 border-transparent"
          }`}
        >
          <span>Result Watcher</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96B]" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="jsession-token" className="block text-[11px] uppercase font-mono tracking-[0.14em] text-[#A8A39A]">
          JSESSION TOKEN
        </label>
        <input
          id="jsession-token"
          name="sessionToken"
          type="password"
          autoComplete="off"
          value={sessionToken}
          onChange={(e) => setSessionToken(e.target.value)}
          placeholder="Paste your JSESSIONID value"
          maxLength={4107}
          required
          className="w-full h-11 px-3.5 rounded bg-[#161614] border border-[#F4F4E9]/[0.10] text-sm text-[#F2EFE8] placeholder:text-[#716D64] focus:outline-none focus:border-[#C8A96B]/60 focus:ring-1 focus:ring-[#C8A96B]/20 transition-colors"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-[11px] uppercase font-mono tracking-[0.14em] text-[#A8A39A]">
          Academic Semester
        </label>
        <div className="grid grid-cols-8 gap-1.5">
          {SEMESTERS.map((sem) => (
            <button
              key={sem}
              type="button"
              onClick={() => {
                setSemesterId(sem);
                onSemesterChange?.(sem);
              }}
              className={`h-10 rounded text-xs font-mono font-medium transition-all ${
                semesterId === sem
                  ? "bg-[#161614] text-[#F2EFE8] border border-[#C8A96B]/70 shadow-[inset_0_2px_0_0_#C8A96B]"
                  : "bg-[#161614] text-[#A8A39A] border border-[#F4F4E9]/[0.08] hover:border-[#F4F4E9]/[0.18] hover:text-[#F2EFE8]"
              }`}
            >
              S{sem}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "watcher" && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setWatcherType("live_watcher")}
              className={`p-4 rounded border text-left transition-all ${
                watcherType === "live_watcher"
                  ? "bg-[#161614] border-[#C8A96B]/60 shadow-[inset_0_2px_0_0_#C8A96B]"
                  : "bg-[#161614] border-[#F4F4E9]/[0.08] hover:border-[#F4F4E9]/[0.18]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase font-mono tracking-[0.14em] text-[#F2EFE8] flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      watcherType === "live_watcher" ? "bg-[#00D492]" : "bg-[#716D64]"
                    }`}
                  />
                  Live Browser Watcher
                </span>
              </div>
              <p className="text-xs text-[#A8A39A] leading-relaxed">
                Keep this tab open to check for results while your KTU session is active.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setWatcherType("background_watcher")}
              className={`p-4 rounded border text-left transition-all ${
                watcherType === "background_watcher"
                  ? "bg-[#161614] border-[#C8A96B]/60 shadow-[inset_0_2px_0_0_#C8A96B]"
                  : "bg-[#161614] border-[#F4F4E9]/[0.08] hover:border-[#F4F4E9]/[0.18]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs uppercase font-mono tracking-[0.14em] text-[#F2EFE8] flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      watcherType === "background_watcher" ? "bg-[#C8A96B]" : "bg-[#716D64]"
                    }`}
                  />
                  Background Auto-Check
                </span>
              </div>
              <p className="text-xs text-[#A8A39A] leading-relaxed">
                Check for results in the background while your KTU session is active.
              </p>
            </button>
          </div>

          {watcherType === "background_watcher" && (
            <p className="rounded border border-[#F4F4E9]/[0.10] bg-[#161614] p-4 text-xs leading-relaxed text-[#A8A39A]">
              The server stores your encrypted session token for up to 12 hours and deletes it after delivery, cancellation, or session expiry.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[11px] uppercase font-mono tracking-[0.14em] text-[#A8A39A]">
                Dispatch Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@domain.com"
                required
                className="w-full h-11 px-3.5 rounded bg-[#161614] border border-[#F4F4E9]/[0.10] text-sm text-[#F2EFE8] placeholder:text-[#716D64] focus:outline-none focus:border-[#C8A96B]/60 focus:ring-1 focus:ring-[#C8A96B]/20 font-mono transition-colors"
              />
            </div>

            {watcherType === "live_watcher" ? (
              <div className="space-y-1.5">
                <label className="block text-[11px] uppercase font-mono tracking-[0.14em] text-[#A8A39A]">
                  Polling Cadence
                </label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded bg-[#161614] border border-[#F4F4E9]/[0.10] text-xs text-[#F2EFE8] focus:outline-none focus:border-[#C8A96B]/60 focus:ring-1 focus:ring-[#C8A96B]/20 font-mono transition-colors"
                >
                  <option value={10}>Every 10 min</option>
                  <option value={15}>Every 15 min</option>
                  <option value={20}>Every 20 min</option>
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-[11px] uppercase font-mono tracking-[0.14em] text-[#A8A39A]">
                  Scheduler Mode
                </label>
                <div className="h-11 flex items-center px-3.5 rounded bg-[#161614] border border-[#F4F4E9]/[0.10] text-xs text-[#A8A39A] font-mono">
                  Self-Host / Cron
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-[#716D64] hover:text-[#A8A39A] flex items-center gap-1 font-mono transition-colors"
        >
          <span>Internal Student ID (Optional)</span>
          <ChevronDown
            size={12}
            className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {showAdvanced && (
          <div className="pt-2">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Leave empty to use the signed-in student"
              className="w-full h-10 px-3.5 rounded bg-[#161614] border border-[#F4F4E9]/[0.10] text-xs text-[#F2EFE8] placeholder:text-[#716D64] focus:outline-none focus:border-[#C8A96B]/60 focus:ring-1 focus:ring-[#C8A96B]/20 font-mono transition-colors"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={
          isLoading ||
          !sessionToken.trim() ||
          (activeTab === "watcher" && !email.trim())
        }
        className="w-full h-11 rounded bg-[#F2EFE8] text-[#0F0F0E] font-medium text-xs uppercase font-mono tracking-[0.14em] flex items-center justify-center gap-2 hover:bg-white active:scale-[0.99] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-[#0F0F0E]" />
            <span>Establishing Secure Session...</span>
          </>
        ) : activeTab === "lookup" ? (
          <>
            <span>Query Semester Grade Card</span>
            <ArrowRight size={13} />
          </>
        ) : watcherType === "live_watcher" ? (
          <>
            <span>Initialize Live Tab Watcher</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D492]" />
          </>
        ) : (
          <>
            <span>Schedule Background Monitoring</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96B]" />
          </>
        )}
      </button>
    </form>
  );
}
