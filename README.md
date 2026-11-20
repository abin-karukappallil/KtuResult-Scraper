# KTU Exam Result Scraper

[![GitHub](https://img.shields.io/badge/GitHub-Open%20Source-blue?logo=github)](https://github.com/abin-karukappallil/KtuResult-Scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/abin-karukappallil/KtuResult-Scraper/blob/main/LICENSE)

A modern, secure web application built with **Next.js 16**, **tRPC**, and **Cheerio** that fetches semester results from the official academic portal — but **faster, cleaner, and more usable**.

This project is independent of the university. Sign in on the official KTU portal and use your active session to look up grades.

---

## 🆚 Why This Over the Official KTU Portal?

| Feature | KTU Portal (`app.ktu.edu.in`) | This App |
|---|---|---|
| **UI/UX** | 2008-era Java JSP pages, no mobile support | Modern responsive UI, dark mode, works on all devices |
| **Session Handling** | Sign in to access grades | Enter a JSESSION TOKEN from your active portal session |
| **Error Messages** | Generic Java stack traces or blank pages | Clear, human-readable error messages |
| **Result View** | Cluttered table with 15+ unnecessary columns | Clean table with only what matters: code, name, credits, grade |
| **Grade Visualization** | None | Color-coded grades + performance matrix bar |
| **Accessibility** | Poor contrast, no keyboard nav | Proper labels, focus rings, semantic HTML |
| **API Abuse Protection** | None (open endpoints) | HMAC-signed tokens + rate limiting |
| **Session Token Storage** | Browser cookie | Encrypted temporary storage for background watchers |

### The Core Problem with KTU Portal

1. **It's painfully slow** — Built on legacy Java/Spring, hosted behind AWS load balancers that frequently drop connections
2. **Sessions expire constantly** — You login, navigate to results, and get "Session Expired" — back to login
3. **The UI is hostile** — Tiny fonts, broken layouts on mobile, no dark mode, confusing navigation
4. **SSL issues** — The portal's TLS certificate chain is misconfigured, causing browser warnings
5. **No API** — Everything is server-rendered HTML with form submissions

The app uses your active KTU session to request the grade card, parses the result HTML with Cheerio, and displays the grades in React.

---

## ✨ Features

### 🔐 Secure Authentication Flow
- Enter the `JSESSIONID` cookie value from your own signed-in KTU session
- The server loads the grade-card form with GET using the supplied `JSESSIONID`. It reads the CSRF token and any `AWSALB` or `AWSALBCORS` cookies KTU returns with the form.
- The semester POST uses the supplied `JSESSIONID`, the CSRF token, and the returned routing cookies. After a successful lookup, the app can reuse the routing cookies in the same server process for up to 30 minutes. The cache key is a hash of the supplied `JSESSIONID`.
- HMAC-signed short-lived API tokens prevent unauthorized API usage
- Rate limiting (5 requests/minute per IP) blocks brute-force and abuse

### 🛡️ API Protection
- **Token system** — Frontend fetches a signed token on page load; every mutation requires it via `x-api-token` header
- **HMAC-SHA256 signed tokens** with 5-minute TTL — cannot be forged without the server secret
- **Per-IP rate limiter** — In-memory request throttling
- **curl/Postman abuse prevention** — External callers cannot replicate the token handshake

### KTU Session Expiry

If KTU expires your session, sign in again on the official portal and enter the new token.

### 🎨 Modern UI
- Clean, minimal design with **Tailwind CSS v4**
- Responsive two-column layout (form + results)
- Dark mode support with system preference detection
- Skeleton loading states and smooth animations
- Grade-based color coding (S/A+ → emerald/blue, F → red with pulse)
- Performance matrix visualization bar

### 📊 Result Display
- Course code, course name, credits, and grade in a clean table
- Total credits and course count summary badges
- Per-course performance bar chart
- Empty state and error handling with clear messaging

### 🔔 Dual-Mode Watcher & Automated React Email Alerts
Never refresh KTU portal constantly on result declaration days. Choose your preferred alert mode:
- **Mode A: Live Watcher (Tab Kept Open)**
  - Periodic polling every 10–20 mins directly from the browser
  - Uses the token from the open browser tab for each check
  - Dispatches email alert as soon as grades are posted
- **Mode B: Offline Background Watcher (Cloudflare & Redis)**
  - Close your tab and walk away
  - Encrypts the session token with AES-256-GCM
  - Ends when KTU rejects the session as expired, the result email is sent, the watcher is revoked, or the 12-hour storage limit is reached
  - Watchers created with a portal password need to be started again with a session token
  - **Custom React Email**: Beautiful grade cards styled with `@react-email/components` and sent via Nodemailer
  - **100% Open-Source**: Transparent and verifiable code at [GitHub Repository](https://github.com/abin-karukappallil/KtuResult-Scraper)

---

## 🚀 Getting Started

### Prerequisites

- **Bun** ≥ 1.0 ([install](https://bun.sh))

```bash
# Install bun (if not already installed)
curl -fsSL https://bun.sh/install | bash
```

### Installation

```bash
git clone https://github.com/your-username/ktuscraper.git
cd ktuscraper
bun install
```

### Environment Variables

Create a `.env.local` file:

```env
# Required for token security in production
# Auto-generated if missing, but set this for consistent behavior across deploys
API_TOKEN_SECRET=your-random-secret-string-here

# Set a separate random secret when using Upstash Redis for background watchers
ENCRYPTION_SECRET=your-random-encryption-secret-here
```

Generate a secure secret:

```bash 
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Development

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
bun run build
bun run start
```

### Linting

```bash
bun run lint
```

---

## 🔧 Tech Stack

| Layer         | Technology                           |
| ------------- | ------------------------------------ |
| Runtime       | Bun                                  |
| Framework     | Next.js 15 (App Router)              |
| API Layer     | tRPC v11                             |
| Data Fetching | TanStack React Query                 |
| HTTP Client   | Fetch                               |
| HTML Parsing  | Cheerio                              |
| Styling       | Tailwind CSS v4                      |
| Icons         | Lucide React                         |
| Validation    | Zod                                  |
| Serialization | SuperJSON                            |
| Deployment    | Vercel                               |

---

## 🔒 Security Model

### Token Lifecycle

```
Page Load
  │
  ├── GET  getToken (publicProcedure)
  │   └── Returns: { token: "nonce.expiry.hmac", expiresAt }
  │
  ├── setApiToken(token) → stored in module-level variable
  │   (NOT localStorage — survives only during tab session)
  │
  ├── Auto-refreshes every 4 minutes (token TTL = 5 min)
  │
  └── Every mutation includes header: x-api-token: "nonce.expiry.hmac"
        │
        └── protectedProcedure verifies:
            1. HMAC signature matches (server secret)
            2. Token has not expired
            3. IP is not rate-limited
```

### Why curl/Postman Abuse is Prevented

| Attack Vector | Defense |
|---|---|
| Direct API call without token | `FORBIDDEN` — token required |
| Forged token | HMAC-SHA256 — needs server secret to forge |
| Stolen token | 5-minute TTL — limited window |
| Brute force | 5 req/min per IP rate limit |
| Replay from different IP | Rate limit applies per IP independently |
| Scraping the token endpoint | Grade lookups also require a valid KTU session |

### Data Retention

| Data | Stored? |
|---|---|
| Student results | ❌ Returned to client, never persisted |
| Session tokens | Encrypted for up to 12 hours when you enable background watching |
| API tokens | ❌ Stateless HMAC verification |
| Request logs | ❌ No database, no analytics |

---

## 📖 Usage

1. Sign in to the official KTU portal in your browser.
2. Paste your active `JSESSIONID` value into **JSESSION TOKEN**. You can also include the `JSESSIONID=` prefix.
3. Select the **semester** (S1–S8).
4. Click **Query Semester Grade Card**.

---

## 🐛 Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| "Invalid or expired request token" | API token expired | Refresh the page |
| "Rate limit exceeded" | Too many requests | Wait 60 seconds |
| "Your KTU session is invalid or expired" | KTU rejected the session | Sign in on the official portal and enter a fresh token |
| "KTU portal responded with HTTP 412" | KTU rejected the request | Try again shortly. The app refreshes the grade card form once if submission returns 412. |
| "No records found" | Semester has no published results | Try a different semester |
| Blank course names | KTU changed their HTML structure | Check server logs, open an issue |
| "Could not extract CSRF token" | KTU portal is down | Try again later |
| Timeout errors | KTU portal is slow/unresponsive | Retry in a few minutes |

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel dashboard → Settings → Environment Variables:

| Variable | Value | Required |
|---|---|---|
| `API_TOKEN_SECRET` | Random 64-char hex string | ✅ Yes |

Generate:

```bash
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Self-Hosted

```bash
bun run build
PORT=3000 bun run start
```

> In-memory rate limiting and in-memory watcher jobs reset on serverless cold starts. Configure Upstash Redis to persist background watcher jobs across restarts.

---

## 🛠️ Development Commands

```bash
bun dev          # Start dev server with hot reload
bun run build    # Production build
bun run start    # Start production server
bun run lint     # Run ESLint
bun test         # Run tests (if configured)
```

---

## 🤝 Contributing

Contributions are welcome! This project is **open source** — feel free to fork, open issues, or submit pull requests.

👉 **GitHub:** [https://github.com/abin-karukappallil/KtuResult-Scraper](https://github.com/abin-karukappallil/KtuResult-Scraper)

---

## 📜 License

MIT — Use at your own risk. Not affiliated with KTU.

