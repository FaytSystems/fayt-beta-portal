// D:\CryptoTrader\fayt-beta-portal\src\App.tsx

import { FormEvent, useEffect, useMemo, useState } from "react";

type Step = "signup" | "verify" | "dashboard";

type BetaUser = {
  id: string;
  status: string;
  trial_type: string;
  trial_starts_at_ms?: number | null;
  trial_ends_at_ms?: number | null;
  payments_enabled: boolean;
};

type BetaDashboard = {
  ok: boolean;
  launch_day_checklist: string[];
  local_env_template: {
    file_name: string;
    values: string[];
  };
};

const API_BASE = String(import.meta.env.VITE_BETA_API_BASE || "https://beta-api.faytsystems.com").replace(/\/$/, "");
const COMPANY_URL = import.meta.env.VITE_COMPANY_URL || "https://faytsystems.com";
const DEMO_URL = import.meta.env.VITE_DEMO_URL || "https://demo.faytsystems.com";
const TERMS_VERSION = "real_money_beta_v1_2026_05";

function formatDate(ms?: number | null): string {
  if (!ms) return "Pending";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail?.message || `Request failed with ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

function MaskedEmail({ email }: { email: string }) {
  const value = useMemo(() => {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    return `${name.slice(0, 2)}â€¢â€¢â€¢@${domain}`;
  }, [email]);

  return <strong>{value}</strong>;
}

function Header() {
  return (
    <header className="topbar">
      <a className="brand" href={COMPANY_URL}>
        <span className="crest"><span>FS</span></span>
        <span>
          <strong>FAYT SYSTEMS</strong>
          <small>Verified Beta Access</small>
        </span>
      </a>

      <nav>
        <a href={COMPANY_URL}>Company</a>
        <a href={DEMO_URL}>Public Demo</a>
      </nav>
    </header>
  );
}

function StatusPanel() {
  return (
    <aside className="heroAside">
      <p className="eyebrow">Beta Boundary</p>
      <h3>Customer-funded. Customer-controlled. Customer-side credentials.</h3>
      <p>
        The beta portal verifies access and gives launch-day instructions. It never asks users to upload
        Coinbase API secrets.
      </p>

      <div className="trustList">
        <div><span>No Fayt custody</span><strong>User funds stay on Coinbase</strong></div>
        <div><span>No web secret upload</span><strong>API credentials stay local</strong></div>
        <div><span>First beta</span><strong>Free 30 days</strong></div>
      </div>
    </aside>
  );
}

function App() {
  const [step, setStep] = useState<Step>("signup");
  const [email, setEmail] = useState(() => localStorage.getItem("fayt_beta_email") || "");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<BetaUser | null>(null);
  const [dashboard, setDashboard] = useState<BetaDashboard | null>(null);

  const [realMoneyAck, setRealMoneyAck] = useState(false);
  const [localKeysAck, setLocalKeysAck] = useState(false);
  const [custodyAck, setCustodyAck] = useState(false);
  const [freeAck, setFreeAck] = useState(false);

  useEffect(() => {
    if (email) localStorage.setItem("fayt_beta_email", email);
  }, [email]);

  async function signup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setDevCode("");

    try {
      const result = await jsonRequest<Record<string, unknown>>("/beta/signup", {
        method: "POST",
        body: JSON.stringify({
          email,
          real_money_ack: realMoneyAck,
          api_keys_local_ack: localKeysAck,
          no_fayt_custody_ack: custodyAck,
          free_beta_ack: freeAck,
          terms_version: TERMS_VERSION,
        }),
      });

      setMessage(String(result.message || "Verification code sent."));
      if (typeof result.dev_code === "string") setDevCode(result.dev_code);
      setStep("verify");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send verification code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const verified = await jsonRequest<{ ok: boolean; user: BetaUser }>("/beta/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });

      const dash = await jsonRequest<BetaDashboard>("/beta/dashboard");

      setUser(verified.user);
      setDashboard(dash);
      setStep("dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to verify code.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await jsonRequest<{ ok: boolean }>("/beta/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }).catch(() => null);

    setUser(null);
    setDashboard(null);
    setCode("");
    setStep("signup");
  }

  const canSignup = Boolean(email && realMoneyAck && localKeysAck && custodyAck && freeAck && !busy);

  const envValues =
    dashboard?.local_env_template?.values || [
      "COINBASE_ADVANCED_API_KEY=your_key_here",
      "COINBASE_ADVANCED_API_SECRET=your_secret_here",
      "COINBASE_ADVANCED_PASSPHRASE=your_passphrase_here",
      "COINBASE_ADVANCED_ORDERS_ALLOWED=false",
      "FAYT_BETA_MAX_OPEN_TRADES=1",
      "FAYT_BETA_MAX_NOTIONAL_PCT=5",
      "FAYT_BETA_DAILY_LOSS_LIMIT_PCT=2",
    ];

  return (
    <main className="site">
      <div className="mesh meshA" />
      <div className="mesh meshB" />
      <div className="noise" />

      <Header />

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Fayt Systems / Real-Money Beta Access</p>
          <h1>Verified access for the 30-day real-money beta.</h1>
          <p className="lede">
            Email verification protects beta access while keeping Coinbase credentials off the website.
            Users fund their own Coinbase Advanced account. Fayt does not receive payment for the first beta period.
          </p>

          <div className="heroDisclosure">
            <strong>Public demo remains separate.</strong>
            <span>Live Coinbase Advanced market data with simulated paper execution.</span>
          </div>
        </div>

        <StatusPanel />
      </section>

      {step === "signup" ? (
        <form className="panel" onSubmit={signup}>
          <p className="eyebrow">Access Verification</p>
          <h2>Confirm the safety boundaries before requesting a code.</h2>
          <p>
            The first beta is free for 30 days. This is a real-money beta, so users must understand
            that trading losses are possible and that credentials remain local.
          </p>

          <label className="field">
            Email address
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="check">
            <input type="checkbox" checked={realMoneyAck} onChange={(event) => setRealMoneyAck(event.target.checked)} />
            <span>I understand this real-money beta may trade with my own funds and losses are possible.</span>
          </label>

          <label className="check">
            <input type="checkbox" checked={localKeysAck} onChange={(event) => setLocalKeysAck(event.target.checked)} />
            <span>I understand Coinbase API secrets must stay local on my own computer and must not be uploaded.</span>
          </label>

          <label className="check">
            <input type="checkbox" checked={custodyAck} onChange={(event) => setCustodyAck(event.target.checked)} />
            <span>I understand Fayt does not custody my funds. My assets stay in my Coinbase Advanced account.</span>
          </label>

          <label className="check">
            <input type="checkbox" checked={freeAck} onChange={(event) => setFreeAck(event.target.checked)} />
            <span>I understand the first beta is free for 30 days and no payment is required now.</span>
          </label>

          <button className="primaryBtn" disabled={!canSignup}>
            {busy ? "Sending Code..." : "Send Verification Code"}
          </button>

          {message ? <p className="message">{message}</p> : null}
        </form>
      ) : null}

      {step === "verify" ? (
        <form className="panel verifyPanel" onSubmit={verify}>
          <p className="eyebrow">Email Verification</p>
          <h2>Enter the 6-digit code.</h2>
          <p>A verification code was sent to <MaskedEmail email={email} />.</p>

          <label className="field codeField">
            Verification code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
          </label>

          <button className="primaryBtn" disabled={busy || code.length !== 6}>
            {busy ? "Verifying..." : "Verify Email"}
          </button>

          <button type="button" className="secondaryBtn" onClick={() => setStep("signup")}>
            Change Email / Resend Code
          </button>

          {message ? <p className="message">{message}</p> : null}
          {devCode ? <p className="devCode">Local dev code: {devCode}</p> : null}
        </form>
      ) : null}

      {step === "dashboard" ? (
        <section className="dashboardGrid">
          <article className="panel wide">
            <p className="eyebrow">Protected Beta Dashboard</p>
            <h1>Real-money beta access verified.</h1>
            <p className="lede">
              This dashboard confirms verified beta access only. It does not collect or store Coinbase API secrets.
              Launch-day credentials stay local on the userâ€™s own computer.
            </p>

            <div className="statGrid">
              <div><span>Status</span><strong>{user?.status || "verified"}</strong></div>
              <div><span>Trial</span><strong>Free 30 Days</strong></div>
              <div><span>Payments</span><strong>Disabled</strong></div>
              <div><span>API Secrets</span><strong>Not Collected</strong></div>
              <div><span>Trial Start</span><strong>{formatDate(user?.trial_starts_at_ms)}</strong></div>
              <div><span>Trial Ends</span><strong>{formatDate(user?.trial_ends_at_ms)}</strong></div>
            </div>

            <button className="secondaryBtn" onClick={logout}>Log Out</button>
          </article>

          <article className="panel">
            <p className="eyebrow">Launch-Day Checklist</p>
            <h2>Before real-money beta trading</h2>
            <ol>
              {(dashboard?.launch_day_checklist || [
                "Confirm your Coinbase Advanced account.",
                "Enable two-factor authentication.",
                "Create the API key only when beta launch instructions are provided.",
                "Do not upload your API secret to Faytâ€™s website.",
                "Store credentials locally on your own computer.",
                "Keep live orders disabled until launch-day checks pass.",
              ]).map((item) => <li key={item}>{item}</li>)}
            </ol>
          </article>

          <article className="panel">
            <p className="eyebrow">Local Credential File</p>
            <h2>Do not upload this file.</h2>
            <p>Store this locally on your own machine only.</p>
            <pre>{envValues.join("\n")}</pre>
          </article>

          <article className="panel warning">
            <p className="eyebrow">Risk Notice</p>
            <h2>Real money means real risk.</h2>
            <p>
              The beta may trade with funds in your own Coinbase Advanced account. Only use capital
              you can afford to lose. Do not enable live orders until launch-day checks are complete.
            </p>
          </article>
        </section>
      ) : null}

      <footer className="footer">
        <div>
          <strong>Fayt Systems Beta</strong>
          <span>Verified Access / No API Upload / Customer-Side Execution</span>
        </div>
        <p>
          The beta portal never asks users to upload Coinbase API secrets. Customer-funded beta trading
          requires local credentials and customer-side execution. Digital asset trading involves risk.
        </p>
      </footer>
    </main>
  );
}

export default App;