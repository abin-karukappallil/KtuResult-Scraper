"use client";

import { useState, useEffect, useRef } from "react";
import { InputForm, type FormValues } from "./InputForm";
import { ResultTable } from "./ResultTable";
import { trpc, setApiToken } from "@/trpc/client";
import {
  Github,
  X,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  GraduationCap,
  AlertCircle,
} from "lucide-react";

interface ResultDashboardProps {
  title: string;
  subtitle?: string;
}

export function ResultDashboard({ title, subtitle }: ResultDashboardProps) {
  const [lastSemesterId, setLastSemesterId] = useState<number | null>(null);

  const [liveWatcherSemesterId, setLiveWatcherSemesterId] = useState<number | null>(null);
  const isLiveWatching = liveWatcherSemesterId !== null;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [checkCount, setCheckCount] = useState<number>(0);
  const [emailNotificationSent, setEmailNotificationSent] = useState<string | null>(null);
  const liveWatchRef = useRef<FormValues | null>(null);
  const secondsUntilLiveCheck = useRef(0);

  const [backgroundWatcherSuccess, setBackgroundWatcherSuccess] = useState<{
    email: string;
    semesterId: number;
    jobId: string;
  } | null>(null);

  const { data: tokenData } = trpc.result.getToken.useQuery(undefined, {
    refetchInterval: 4 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (tokenData?.token) {
      setApiToken(tokenData.token);
    }
  }, [tokenData]);

  const {
    data: scrapeData,
    error: scrapeError,
    isPending: isScrapePending,
    mutate: executeScrape,
    reset: resetScrape,
  } = trpc.result.getResults.useMutation({
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        handleStopLiveWatcher();
      }
    },
    onSuccess: (res) => {
      if (res.courses.length > 0 && liveWatchRef.current?.email) {
        sendEmailMutation.mutate({
          to: liveWatchRef.current.email,
          semesterId: liveWatchRef.current.semesterId,
          courses: res.courses,
          sgpa: res.sgpa,
          sourceMode: "live_watcher",
        });
        setEmailNotificationSent(liveWatchRef.current.email);
        handleStopLiveWatcher();
      }
    },
  });

  const subscribeMutation = trpc.result.subscribeWatcher.useMutation({
    onSuccess: (res, vars) => {
      if (res.status === "already_available") {
        setEmailNotificationSent(vars.email);
      } else {
        setBackgroundWatcherSuccess({
          email: vars.email,
          semesterId: vars.semesterId,
          jobId: res.jobId,
        });
      }
    },
  });

  const cancelWatcherMutation = trpc.result.cancelWatcher.useMutation({
    onSuccess: () => {
      setBackgroundWatcherSuccess(null);
    },
  });

  const sendEmailMutation = trpc.result.sendEmailResult.useMutation();

  useEffect(() => {
    if (!isLiveWatching || !liveWatchRef.current) return;

    const timer = setInterval(() => {
      const watcher = liveWatchRef.current;
      if (!watcher) return;

      secondsUntilLiveCheck.current -= 1;
      if (secondsUntilLiveCheck.current <= 0) {
        secondsUntilLiveCheck.current = (watcher.intervalMinutes ?? 15) * 60;
        setCheckCount((count) => count + 1);
        executeScrape({
          sessionToken: watcher.sessionToken,
          semesterId: watcher.semesterId,
          studentId: watcher.studentId || undefined,
        });
      }
      setSecondsRemaining(secondsUntilLiveCheck.current);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLiveWatching, executeScrape]);

  const handleSemesterChange = (newSemester: number) => {
    if (lastSemesterId !== null && lastSemesterId !== newSemester) {
      resetScrape();
      subscribeMutation.reset();
      setLastSemesterId(null);
      handleStopLiveWatcher();
      setBackgroundWatcherSuccess(null);
      setEmailNotificationSent(null);
    }
  };

  const handleSubmit = (values: FormValues) => {
    resetScrape();
    subscribeMutation.reset();
    setLastSemesterId(values.semesterId);
    setEmailNotificationSent(null);
    setBackgroundWatcherSuccess(null);

    const payload = {
      sessionToken: values.sessionToken,
      semesterId: values.semesterId,
      studentId: values.studentId || undefined,
    };

    if (values.mode === "instant") {
      handleStopLiveWatcher();
      executeScrape(payload);
    } else if (values.mode === "live_watcher") {
      liveWatchRef.current = values;
      const intervalSecs = (values.intervalMinutes ?? 15) * 60;
      secondsUntilLiveCheck.current = intervalSecs;
      setSecondsRemaining(intervalSecs);
      setCheckCount(1);
      setLiveWatcherSemesterId(values.semesterId);

      executeScrape(payload);
    } else if (values.email) {
      handleStopLiveWatcher();
      subscribeMutation.mutate({ ...payload, email: values.email });
    }
  };

  function handleStopLiveWatcher() {
    setLiveWatcherSemesterId(null);
    liveWatchRef.current = null;
  }

  const subscription = subscribeMutation.data;
  const courses = scrapeData?.courses ??
    (subscription?.status === "already_available" ? subscription.courses : []);
  const isLoading = isScrapePending || subscribeMutation.isPending;
  const currentError = scrapeError || subscribeMutation.error;
  const portalSessionIssue = currentError?.data?.code === "UNAUTHORIZED";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#0F0F0E] text-[#F2EFE8] flex flex-col justify-between">
      <div>
        <header className="border-b border-[#F4F4E9]/[0.08] bg-[#0F0F0E]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display font-semibold text-sm tracking-tight text-[#F2EFE8]">
                Academic Result Scraper
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com/abin-karukappallil/KtuResult-Scraper"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#A8A39A] hover:text-[#F2EFE8] transition-colors p-1"
                aria-label="GitHub Repository"
              >
                <Github size={16} />
              </a>
            </div>
          </div>
        </header>

        {liveWatcherSemesterId !== null && (
          <div className="border-b border-[#F4F4E9]/[0.08] bg-[#131311] px-4 py-2.5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D492] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D492]" />
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#F2EFE8]">
                  Live Watcher Active: S{liveWatcherSemesterId}
                </span>
                <span className="text-[#716D64] font-mono hidden sm:inline">
                  Next polling in {formatTime(secondsRemaining)} | Check #{checkCount}
                </span>
              </div>

              <button
                onClick={handleStopLiveWatcher}
                className="text-[#A8A39A] hover:text-[#F2EFE8] font-mono text-xs uppercase tracking-[0.12em] underline flex items-center gap-1"
              >
                <span>Halt</span>
                <X size={11} />
              </button>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="mb-8 space-y-2">
            <span className="text-[11px] uppercase font-mono tracking-[0.2em] text-[#C8A96B] font-medium block">
              Academic Examination Portal
            </span>
            <h1 className="text-2xl sm:text-4xl font-semibold font-display tracking-tight text-[#F2EFE8]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[#A8A39A] text-xs sm:text-sm leading-relaxed max-w-3xl">
                {subtitle}
              </p>
            )}
          </div>

          <section
            aria-labelledby="portal-session-title"
            className="mb-6 flex flex-col justify-between gap-4 rounded border border-[#C8A96B]/40 bg-[#C8A96B]/10 p-4 sm:flex-row sm:items-center sm:p-5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#C8A96B]" aria-hidden="true" />
              <div className="space-y-1">
                <h2 id="portal-session-title" className="text-sm font-semibold text-[#F2EFE8]">
                  Sign in on the KTU portal first
                </h2>
                <p className="text-sm leading-relaxed text-[#D0CCC3]">
                  Complete sign-in in your browser, then enter the JSESSIONID(click f12 after login in ktu and go to storage → cookies → JSESSIONID copy its value and use it here..it will expire in 24hrs btw) value from your active KTU session.
                </p>
              </div>
            </div>
            <a
              href="https://app.ktu.edu.in/login.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded bg-[#C8A96B] px-3 py-2 text-sm font-medium text-[#0F0F0E] transition-colors hover:bg-[#e4cf9b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8A96B] sm:self-auto"
            >
              Open KTU portal
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="rounded border border-[#F4F4E9]/[0.08] bg-[#131311] p-5 sm:p-6 shadow-sm">
                <InputForm
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  onSemesterChange={handleSemesterChange}
                />
              </div>

            </div>

            <div className="lg:col-span-6 space-y-4">
              {emailNotificationSent && (
                <div className="p-4 rounded border border-[#00D492]/30 bg-[#131311] text-xs text-[#A8A39A] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={14} className="text-[#00D492] shrink-0" />
                    <span>
                      Compiled grade card dispatched via custom React Mail to{" "}
                      <strong className="text-[#F2EFE8] font-mono">{emailNotificationSent}</strong>.
                    </span>
                  </div>
                  <button
                    onClick={() => setEmailNotificationSent(null)}
                    className="text-[#716D64] hover:text-[#F2EFE8] p-1"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {currentError && (
                <div role="alert" className="p-4 rounded border border-[#FF5C5C]/30 bg-[#131311] text-xs text-[#A8A39A] flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C5C] mt-1.5 shrink-0" />
                  <div>
                    <span className="font-mono uppercase tracking-[0.12em] text-[#FF5C5C] block mb-0.5">
                      {portalSessionIssue ? "KTU session unavailable" : "Request failed"}
                    </span>
                    <p className="text-xs text-[#F2EFE8]">{currentError.message}</p>
                    {portalSessionIssue && (
                      <a
                        href="https://app.ktu.edu.in/login.htm"
                        className="mt-2 inline-flex items-center gap-1 text-[#C8A96B] hover:text-[#e4cf9b] underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open official KTU login
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {backgroundWatcherSuccess && (
                <div className="p-5 rounded border border-[#F4F4E9]/[0.08] bg-[#131311] text-xs space-y-3 shadow-[inset_0_2px_0_0_#C8A96B]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#C8A96B]" />
                      <span className="font-mono uppercase tracking-[0.14em] text-[#F2EFE8]">
                        Background Job Enqueued: Semester {backgroundWatcherSuccess.semesterId}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        cancelWatcherMutation.mutate({ jobId: backgroundWatcherSuccess.jobId })
                      }
                      className="text-[#716D64] hover:text-[#FF5C5C] text-[11px] font-mono uppercase tracking-[0.12em] underline transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                  <p className="text-[#A8A39A] leading-[1.8] text-xs">
                    You can close this tab. If results are published while your KTU session is active, your grade card will be emailed to{" "}
                    <strong className="text-[#F2EFE8] font-mono">{backgroundWatcherSuccess.email}</strong>.
                  </p>
                </div>
              )}

              {isScrapePending ? (
                <div className="h-72 flex flex-col items-center justify-center border border-[#F4F4E9]/[0.08] rounded bg-[#131311] p-6 text-center">
                  <div className="w-5 h-5 border-2 border-[#716D64] border-t-[#C8A96B] rounded-full animate-spin" />
                  <span className="mt-4 text-xs text-[#F2EFE8] font-mono uppercase tracking-[0.14em]">
                    Querying Student Portal Proxy
                  </span>
                  <p className="mt-1 text-[11px] text-[#716D64] font-mono">
                    Bypassing gateway congestion & parsing student grade records...
                  </p>
                </div>
              ) : currentError ? null : courses.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-mono tracking-[0.16em] text-[#C8A96B] font-medium">
                        Verified Grade Records
                      </span>
                      <span className="text-[10px] font-mono text-[#716D64]">
                        Semester {lastSemesterId ?? 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        resetScrape();
                        subscribeMutation.reset();
                        setLastSemesterId(null);
                      }}
                      className="text-xs text-[#716D64] hover:text-[#F2EFE8] flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] transition-colors"
                    >
                      <RotateCcw size={11} />
                      <span>Reset View</span>
                    </button>
                  </div>

                  <ResultTable
                    courses={courses}
                    semesterId={lastSemesterId ?? 1}
                    isLoading={false}
                  />
                </div>
              ) : lastSemesterId !== null && !backgroundWatcherSuccess ? (
                <div className="p-8 text-center border border-dashed border-[#F4F4E9]/[0.10] rounded bg-[#131311] space-y-2">
                  <p className="text-sm font-medium text-[#F2EFE8]">
                    No Published Records Found
                  </p>
                  <p className="text-xs text-[#716D64] font-mono max-w-md mx-auto">
                    No grades were found for Semester {lastSemesterId}. Use Result Watcher for an email if they are published while your session is active.
                  </p>
                </div>
              ) : !backgroundWatcherSuccess ? (
                <div className="rounded border border-[#F4F4E9]/[0.08] bg-[#131311] p-6 sm:p-8 space-y-6">
                  <div className="flex items-start justify-between border-b border-[#F4F4E9]/[0.08] pb-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono tracking-[0.18em] text-[#C8A96B] font-medium block">
                        Academic Ledger
                      </span>
                      <h2 className="text-lg font-semibold font-display tracking-tight text-[#F2EFE8]">
                        Awaiting Examination Query
                      </h2>
                    </div>
                  </div>

                  <p className="text-xs text-[#A8A39A] leading-relaxed">
                    Enter your JSESSION TOKEN and choose a semester to view your grade card.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded bg-[#161614] border border-[#F4F4E9]/[0.08]">
                      <span className="text-[10px] uppercase font-mono tracking-[0.14em] text-[#C8A96B] block mb-1">
                        Calculation
                      </span>
                      <span className="text-xs font-medium text-[#F2EFE8] block mb-1">
                        Automated SGPA
                      </span>
                      <p className="text-[11px] text-[#716D64] leading-normal font-mono">
                        Credit-weighted computation matching official grading guidelines.
                      </p>
                    </div>

                    <div className="p-3.5 rounded bg-[#161614] border border-[#F4F4E9]/[0.08]">
                      <span className="text-[10px] uppercase font-mono tracking-[0.14em] text-[#4D6BFE] block mb-1">
                        Telemetry
                      </span>
                      <span className="text-xs font-medium text-[#F2EFE8] block mb-1">
                        Backlog Detection
                      </span>
                      <p className="text-[11px] text-[#716D64] leading-normal font-mono">
                        Instant recognition of F, FE, and Absent evaluation states.
                      </p>
                    </div>

                    <div className="p-3.5 rounded bg-[#161614] border border-[#F4F4E9]/[0.08]">
                      <span className="text-[10px] uppercase font-mono tracking-[0.14em] text-[#00D492] block mb-1">
                        Delivery
                      </span>
                      <span className="text-xs font-medium text-[#F2EFE8] block mb-1">
                        Instant Notification
                      </span>
                      <p className="text-[11px] text-[#716D64] leading-normal font-mono">
                        Compiled grade cards delivered directly to your inbox.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      <footer className="border-t border-[#F4F4E9]/[0.08] py-8 text-xs text-[#716D64] font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <GraduationCap size={14} className="text-[#C8A96B]" />
              <span className="text-[#A8A39A]">Academic Examination Proxy Engine</span>
            </div>
            <p className="text-[10px] text-[#525250]">
              Official Notice: Cross-verify all compiled grade cards on official portal (app.ktu.edu.in) after release traffic normalizes.
            </p>
          </div>

          <a
            href="https://github.com/abin-karukappallil/KtuResult-Scraper"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#F2EFE8] underline inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>Open Source Repository</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </footer>
    </div>
  );
}
