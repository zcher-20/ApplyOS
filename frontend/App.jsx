import { useState, useRef, useEffect } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0a0a0f;
    --paper: #f0ede8;
    --cream: #f7f4ef;
    --accent: #e84545;
    --accent2: #2563eb;
    --gold: #d4a847;
    --muted: #6b6b7a;
    --border: rgba(10,10,15,0.12);
    --card-bg: #ffffff;
    --tag-bg: rgba(37,99,235,0.08);
    --tag-color: #1d4ed8;
    --success: #16a34a;
    --warning: #d97706;
    --gap: #dc2626;
  }

  body {
    font-family: 'Inter', sans-serif;
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 48px; height: 64px;
    background: var(--ink); color: var(--paper);
    position: sticky; top: 0; z-index: 100;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .logo {
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px;
    letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px;
  }
  .logo-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; }
  .nav { display: flex; gap: 8px; }
  .nav-chip {
    padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
    background: transparent; border: 1px solid rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.2s;
  }
  .nav-chip:hover, .nav-chip.active {
    background: var(--accent); border-color: var(--accent); color: #fff;
  }

  /* ── Main layout ── */
  .main { flex: 1; max-width: 1200px; margin: 0 auto; width: 100%; padding: 40px 24px; }

  /* ── Upload zone ── */
  .upload-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;
  }
  .input-card {
    background: var(--card-bg); border: 1.5px solid var(--border); border-radius: 16px;
    padding: 24px; position: relative; overflow: hidden;
  }
  .input-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    opacity: 0;  transition: opacity 0.3s;
  }
  .input-card:focus-within::before { opacity: 1; }

  .card-label {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
    letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);
    margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
  }
  .card-label-num {
    width: 22px; height: 22px; border-radius: 50%; background: var(--ink);
    color: var(--paper); font-size: 11px; display: flex; align-items: center;
    justify-content: center; font-family: 'JetBrains Mono', monospace;
  }

  .drop-zone {
    border: 2px dashed var(--border); border-radius: 12px; padding: 32px 20px;
    text-align: center; cursor: pointer; transition: all 0.2s;
    background: var(--cream);
  }
  .drop-zone:hover, .drop-zone.dragover {
    border-color: var(--accent2); background: var(--tag-bg);
  }
  .drop-icon { font-size: 28px; margin-bottom: 8px; }
  .drop-text { font-size: 13px; color: var(--muted); }
  .drop-text strong { color: var(--accent2); }
  .drop-sub { font-size: 11px; color: var(--muted); margin-top: 4px;
    font-family: 'JetBrains Mono', monospace; }
  .file-attached {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
    font-size: 13px; color: var(--success); margin-top: 10px;
  }

  textarea {
    width: 100%; border: none; background: transparent; font-family: 'Inter', sans-serif;
    font-size: 13px; color: var(--ink); resize: none; outline: none; line-height: 1.6;
  }
  textarea::placeholder { color: var(--muted); }

  .company-row {
    grid-column: 1 / -1;
    display: flex; gap: 12px; align-items: center;
  }
  .company-input {
    flex: 1; padding: 12px 16px; border: 1.5px solid var(--border);
    border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 13px;
    background: var(--card-bg); color: var(--ink); outline: none;
    transition: border-color 0.2s;
  }
  .company-input:focus { border-color: var(--accent2); }

  /* ── CTA Button ── */
  .analyze-btn {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; padding: 16px; border-radius: 14px;
    background: var(--ink); color: var(--paper);
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 15px;
    letter-spacing: 0.02em; border: none; cursor: pointer;
    transition: all 0.25s; margin-top: 8px;
    position: relative; overflow: hidden;
  }
  .analyze-btn::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    opacity: 0; transition: opacity 0.3s;
  }
  .analyze-btn:hover::after { opacity: 1; }
  .analyze-btn span { position: relative; z-index: 1; }
  .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .analyze-btn.loading { animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.7 } }

  /* ── Progress ── */
  .progress-bar {
    height: 3px; background: var(--border); border-radius: 2px; margin: 16px 0; overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 2px; transition: width 0.8s ease;
  }
  .progress-steps {
    display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0;
  }
  .step-chip {
    padding: 4px 12px; border-radius: 20px; font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    border: 1px solid var(--border); color: var(--muted);
    transition: all 0.3s;
  }
  .step-chip.done { background: #f0fdf4; border-color: #bbf7d0; color: var(--success); }
  .step-chip.active {
    background: var(--ink); color: var(--paper); border-color: var(--ink);
    animation: blink 1s ease-in-out infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.6} }

  /* ── Results layout ── */
  .results { display: flex; flex-direction: column; gap: 24px; }

  .section-header {
    display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px;
  }
  .section-title {
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; letter-spacing: -0.3px;
  }
  .section-meta { font-size: 12px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }

  /* ── ATS Score card ── */
  .ats-hero {
    background: var(--ink); color: var(--paper); border-radius: 20px;
    padding: 32px; display: grid; grid-template-columns: auto 1fr; gap: 32px;
    align-items: center;
  }
  .score-ring {
    width: 120px; height: 120px; position: relative; flex-shrink: 0;
  }
  .score-ring svg { transform: rotate(-90deg); }
  .score-ring-label {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .score-num {
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 32px; color: var(--paper);
    line-height: 1;
  }
  .score-denom { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'JetBrains Mono', monospace; }
  .ats-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .breakdown-item { }
  .breakdown-label { font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
  .breakdown-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
  .breakdown-fill { height: 100%; border-radius: 2px; }
  .breakdown-val { font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: rgba(255,255,255,0.8); margin-top: 3px; }

  /* ── Skill grid ── */
  .skill-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .skill-tag {
    padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
    display: flex; align-items: center; gap: 6px; border: 1px solid;
  }
  .skill-tag.present { background: #f0fdf4; border-color: #86efac; color: var(--success); }
  .skill-tag.partial { background: #fffbeb; border-color: #fcd34d; color: var(--warning); }
  .skill-tag.missing { background: #fef2f2; border-color: #fca5a5; color: var(--gap); }
  .skill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  /* ── Gap items ── */
  .gap-list { display: flex; flex-direction: column; gap: 12px; }
  .gap-item {
    padding: 16px; border-radius: 12px; border: 1.5px solid var(--border);
    background: var(--card-bg); display: grid; grid-template-columns: auto 1fr auto; gap: 12px;
    align-items: start;
  }
  .gap-icon { font-size: 18px; margin-top: 2px; }
  .gap-skill { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; }
  .gap-rec { font-size: 13px; color: var(--muted); margin-top: 4px; line-height: 1.5; }
  .effort-badge {
    padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
    font-family: 'JetBrains Mono', monospace; white-space: nowrap;
  }
  .effort-badge.quick-win { background: #f0fdf4; color: var(--success); }
  .effort-badge.medium { background: #fffbeb; color: var(--warning); }
  .effort-badge.long-term { background: #fef2f2; color: var(--gap); }

  /* ── Bullets ── */
  .bullet-role { margin-bottom: 20px; }
  .role-header {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px;
    padding: 8px 0; border-bottom: 1px solid var(--border); margin-bottom: 12px;
    display: flex; gap: 8px; align-items: center;
  }
  .role-badge {
    font-size: 11px; font-family: 'JetBrains Mono', monospace;
    background: var(--tag-bg); color: var(--tag-color);
    padding: 2px 8px; border-radius: 10px;
  }
  .bullet-pair { margin-bottom: 12px; }
  .bullet-original {
    font-size: 12px; color: var(--muted); padding: 8px 12px;
    background: var(--cream); border-radius: 6px; margin-bottom: 6px;
    font-family: 'JetBrains Mono', monospace; line-height: 1.5;
    border-left: 3px solid var(--border);
  }
  .bullet-rewritten {
    font-size: 13px; color: var(--ink); padding: 10px 14px;
    background: var(--card-bg); border-radius: 8px; line-height: 1.6;
    border-left: 3px solid var(--accent2);
    border: 1px solid rgba(37,99,235,0.15); border-left-width: 3px;
  }
  .kw-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .kw-chip {
    font-size: 10px; font-family: 'JetBrains Mono', monospace;
    background: var(--tag-bg); color: var(--tag-color);
    padding: 2px 7px; border-radius: 8px;
  }

  /* ── Interview cards ── */
  .question-cards { display: flex; flex-direction: column; gap: 12px; }
  .q-card {
    background: var(--card-bg); border: 1.5px solid var(--border);
    border-radius: 14px; padding: 18px; overflow: hidden;
  }
  .q-category {
    font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
    display: flex; align-items: center; gap: 6px;
  }
  .q-cat-dot { width: 6px; height: 6px; border-radius: 50%; }
  .q-cat-dot.behavioral { background: var(--accent2); }
  .q-cat-dot.technical { background: var(--accent); }
  .q-cat-dot.company { background: var(--gold); }
  .q-text { font-size: 14px; font-weight: 500; margin-bottom: 10px; line-height: 1.5; }
  .q-hint { font-size: 12px; color: var(--muted); padding: 8px 12px;
    background: var(--cream); border-radius: 8px; line-height: 1.5; }
  .star-scaffold {
    font-size: 12px; font-family: 'JetBrains Mono', monospace;
    color: var(--muted); margin-top: 8px; line-height: 1.7;
    padding: 8px 12px; background: #f8f7ff; border-radius: 6px;
    border-left: 2px solid var(--accent2);
  }
  .star-label { color: var(--accent2); font-weight: 500; }

  /* ── Talking points ── */
  .tp-list { display: flex; flex-direction: column; gap: 10px; }
  .tp-item {
    padding: 14px 16px; border-radius: 12px;
    background: linear-gradient(135deg, #fefce8, #fff);
    border: 1px solid #fde68a;
  }
  .tp-topic { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px;
    color: #92400e; margin-bottom: 4px; }
  .tp-point { font-size: 13px; color: var(--ink); line-height: 1.5; }
  .tp-source { font-size: 11px; color: var(--muted); margin-top: 6px;
    font-family: 'JetBrains Mono', monospace; }

  /* ── Quick wins ── */
  .quick-wins {
    background: linear-gradient(135deg, #f0fdf4, #fff);
    border: 1.5px solid #bbf7d0; border-radius: 16px; padding: 20px;
  }
  .quick-win-item {
    display: flex; gap: 12px; align-items: start; padding: 10px 0;
    border-bottom: 1px solid #d1fae5;
  }
  .quick-win-item:last-child { border-bottom: none; }
  .qw-num {
    width: 24px; height: 24px; border-radius: 50%; background: var(--success);
    color: white; font-size: 11px; font-weight: 700; display: flex;
    align-items: center; justify-content: center; flex-shrink: 0;
    font-family: 'Syne', sans-serif;
  }
  .qw-text { font-size: 13px; line-height: 1.5; }

  /* ── Quality eval ── */
  .eval-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .eval-card {
    background: var(--card-bg); border: 1px solid var(--border);
    border-radius: 12px; padding: 14px; text-align: center;
  }
  .eval-metric { font-size: 11px; color: var(--muted); margin-bottom: 6px;
    font-family: 'JetBrains Mono', monospace; }
  .eval-score {
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px;
  }

  /* ── Tabs ── */
  .tabs { display: flex; gap: 4px; background: var(--cream);
    padding: 4px; border-radius: 12px; margin-bottom: 20px; }
  .tab {
    flex: 1; padding: 8px 12px; border-radius: 9px; border: none; cursor: pointer;
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
    background: transparent; color: var(--muted); transition: all 0.2s;
    text-align: center;
  }
  .tab.active { background: var(--card-bg); color: var(--ink);
    box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

  /* ── Hallucination flags ── */
  .flags-box {
    background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px;
  }
  .flag-item { display: flex; gap: 8px; align-items: start; font-size: 12px;
    color: #92400e; padding: 4px 0; }

  /* ── Closing pitch ── */
  .pitch-box {
    background: var(--ink); color: var(--paper); border-radius: 14px; padding: 20px;
    font-size: 14px; line-height: 1.7; font-style: italic;
    position: relative; overflow: hidden;
  }
  .pitch-box::before {
    content: '"'; position: absolute; top: -8px; left: 12px;
    font-family: 'Syne', sans-serif; font-size: 80px; color: rgba(255,255,255,0.06);
    line-height: 1;
  }

  /* ── Empty / demo state ── */
  .empty-state {
    text-align: center; padding: 80px 40px;
    display: flex; flex-direction: column; align-items: center; gap: 16px;
  }
  .empty-icon { font-size: 48px; }
  .empty-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 24px; }
  .empty-sub { color: var(--muted); font-size: 14px; max-width: 400px; line-height: 1.6; }

  /* ── Misc utils ── */
  .card { background: var(--card-bg); border: 1.5px solid var(--border);
    border-radius: 16px; padding: 24px; }
  .divider { height: 1px; background: var(--border); margin: 4px 0; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  .text-muted { color: var(--muted); }
  .fade-in { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
`;

// ─── Mock data for demo ───────────────────────────────────────────────────────
const MOCK_RESULT = {
  session_id: "demo-session-001",
  ats_score: 72,
  overall_quality_score: 0.84,
  errors: [],
  results: {
    job_profile: { job_title: "Senior Software Engineer", company_name: "Stripe", seniority: "Senior", ats_keywords: ["Python","distributed systems","API design","PostgreSQL","Kubernetes","gRPC","reliability","SLO","incident response"] },
    skill_gap_report: {
      ats_score: { required_skills_score: 38, preferred_skills_score: 18, keyword_coverage_score: 10, experience_alignment_score: 6, total_score: 72 },
      skill_matches: [
        { skill: "Python", status: "present", importance: "required", candidate_evidence: "5+ years Python; built ML pipeline at Acme Corp" },
        { skill: "Distributed Systems", status: "present", importance: "required", candidate_evidence: "Led migration of monolith to microservices" },
        { skill: "PostgreSQL", status: "present", importance: "required", candidate_evidence: "Designed schema for 50M record user DB" },
        { skill: "Kubernetes", status: "partial", importance: "required", candidate_evidence: "Used k8s in CI but no production ownership" },
        { skill: "gRPC", status: "missing", importance: "required", candidate_evidence: "" },
        { skill: "Kafka", status: "partial", importance: "preferred", candidate_evidence: "Familiar with pub-sub concepts, no direct Kafka exp" },
        { skill: "Go", status: "missing", importance: "preferred", candidate_evidence: "" },
      ],
      gaps: [
        { skill: "gRPC", importance: "required", recommendation: "Complete gRPC official quickstart + build a toy bidirectional streaming service. Add to GitHub within 2 weeks.", effort: "quick-win" },
        { skill: "Kubernetes production ownership", importance: "required", recommendation: "Take CKA exam prep course; deploy a personal project to k8s on GKE with HPA and PodDisruptionBudget.", effort: "medium" },
        { skill: "Go", importance: "preferred", recommendation: "Work through the Go tour + Tour of Go exercises. Stripe uses Go heavily for their core platform.", effort: "long-term" },
      ],
      top_3_quick_wins: [
        "Add 'Kubernetes' to skills section — you have partial experience that qualifies, just under-represented",
        "Build a gRPC toy service (2–4 hours) and add it to GitHub before applying",
        "Rewrite your Acme Corp bullets to emphasize latency/reliability outcomes (Stripe values SLO thinking)",
      ],
      keyword_hits: ["Python","distributed systems","API design","PostgreSQL","reliability"],
      keyword_misses: ["Kubernetes","gRPC","SLO","incident response","gRPC","Kafka"],
      overall_verdict: "Strong candidate with solid backend fundamentals. The missing gRPC experience and limited Kubernetes production depth are the main gaps. With 2–3 quick fixes, this profile could realistically score 85+. The resume currently buries the most relevant distributed-systems work — surface it explicitly.",
    },
    bullet_rewrite_report: {
      summary_rewrite: "Senior Software Engineer with 6 years designing and scaling distributed backend systems in Python, now targeting Stripe's infrastructure team. Proven track record of improving API reliability and database performance at scale; excited to apply that expertise to Stripe's payments platform.",
      skills_section_suggestion: "Python · PostgreSQL · Distributed Systems · REST API Design · Kubernetes · Redis · Docker · CI/CD · System Design · Incident Response",
      cover_letter_opener: "Stripe's API-first culture and the challenge of moving money reliably for millions of businesses is exactly the kind of high-stakes infrastructure problem I've been preparing for.",
      roles: [
        {
          company: "Acme Corp", title: "Software Engineer II",
          bullets: [
            { original: "Responsible for improving database performance", rewritten: "Reduced P99 query latency by 60% on a 50M-row PostgreSQL database by redesigning indexes and introducing read replicas — improving checkout reliability from 99.2% to 99.9% uptime.", keywords_added: ["PostgreSQL","reliability","latency"], is_new: false, rationale: "Quantified impact, added reliability framing that matches Stripe's SLO focus" },
            { original: "Worked on microservices migration", rewritten: "Architected and led migration of a 200k-LOC Python monolith to 12 microservices using gRPC-compatible REST interfaces, cutting deployment frequency from biweekly to 40+ deploys/day.", keywords_added: ["Python","distributed systems","API design"], is_new: false, rationale: "Lead verb, quantified scale, mirrored Stripe's distributed-systems language" },
          ]
        }
      ]
    },
    interview_prep_report: {
      behavioral_questions: [
        { question: "Tell me about a time you improved system reliability under pressure.", category: "behavioral", why_likely: "Stripe is obsessed with reliability; your gap in formal SLO experience will be probed.", star_hint: "Use your Acme DB optimization story — 99.2% → 99.9% uptime is concrete.", sample_answer_scaffold: "[SITUATION] Our payment processing DB was degrading under peak load. [TASK] I owned the investigation and fix while keeping the system live. [ACTION] Analyzed slow query log, redesigned 3 composite indexes, added a read replica. [RESULT] P99 latency dropped 60%, uptime improved to 99.9% — zero customer-visible incidents." },
        { question: "Describe a disagreement with an engineer on your team and how you resolved it.", category: "behavioral", why_likely: "Stripe values intellectual humility and directness in its engineering culture.", star_hint: "The microservices architecture debate you mentioned in your resume notes.", sample_answer_scaffold: "[SITUATION] Disagreed on synchronous vs async comms between services. [TASK] Build consensus without slowing the project. [ACTION] Ran a 2-hour design session with data from prod latency. [RESULT] Team chose hybrid approach; reduced coupling while meeting SLA." },
      ],
      technical_questions: [
        { question: "How would you design a distributed rate-limiting system for a payments API handling 1M RPS?", category: "technical", why_likely: "Directly relevant to Stripe's core API infra; tests your distributed systems depth.", star_hint: "Mention token bucket, sliding window, and Redis Lua scripts — show you've thought about distributed consensus.", sample_answer_scaffold: "[SITUATION] N/A — design question. [TASK] Describe architecture. [ACTION] Token bucket in Redis + consistent hashing for sharding + fallback to local rate limits on Redis failure. [RESULT] 1M RPS with <5ms overhead per request." },
        { question: "Explain how PostgreSQL MVCC works and when you'd choose it over a NoSQL store.", category: "technical", why_likely: "Stripe is PostgreSQL-heavy; your DB background will be tested deeply.", star_hint: "Lead with MVCC transaction isolation, mention your 50M-row schema work as proof.", sample_answer_scaffold: "[SITUATION] N/A. [TASK] Explain tradeoffs. [ACTION] MVCC explanation → ACID guarantees → when consistency > scale. [RESULT] Choose Postgres when correctness is non-negotiable (payments ✓)." },
      ],
      company_specific_questions: [
        { question: "Stripe recently launched Stablecoin Financial Accounts — how do you see that changing the payments infrastructure challenge?", category: "company", why_likely: "Shows you follow Stripe's product roadmap and can connect infra thinking to business context.", star_hint: "Research Stripe's stablecoin announcement; connect to distributed consistency challenges.", sample_answer_scaffold: "[SITUATION] Stripe expanding to crypto-native financial products. [TASK] Discuss infra implications. [ACTION] Settlement finality, cross-chain reconciliation, novel reliability requirements. [RESULT] Opportunity to apply your reliability work to a new domain." },
      ],
      company_talking_points: [
        { topic: "API Design Philosophy", point: "Stripe is renowned for treating API design as a product — every endpoint is a long-term commitment. Mention that you approach API contracts with the same mindset, citing your versioning work at Acme.", source: "Stripe Engineering Blog" },
        { topic: "Reliability Culture", point: "Stripe runs a blameless postmortem culture and tracks SLOs rigorously. Frame your DB optimization work explicitly as an SLO improvement, not just a performance win.", source: "Stripe Jobs JD + Engineering values" },
      ],
      questions_to_ask: [
        { question: "How does the team balance velocity against the reliability SLOs on the core payments API — what does that tension look like in practice?", why_smart: "Shows you understand the core engineering tradeoff at a payments company and have thought about it before the interview." },
        { question: "What does the on-call rotation look like for this team, and how has the incident volume changed over the past year?", why_smart: "Signals you're serious about operational responsibility, not just writing code." },
      ],
      red_flags_to_address: [
        "Limited formal Kubernetes production ownership — preemptively mention your CKA prep and describe the k8s clusters you've used, even if not owned",
        "No gRPC on resume — address this by having a gRPC toy project live on GitHub before the interview",
      ],
      closing_pitch: "I've spent 6 years building the kind of high-reliability, high-scale backend systems that Stripe runs at 100x the volume — and I'm excited to bring that foundation to a team where the correctness of every transaction genuinely matters. I'm confident I can contribute immediately to your infra reliability work while growing into the gRPC and Go parts of the stack.",
    },
    hallucination_flags: [],
    rubric_scores: { completeness: 1.0, specificity: 0.87, actionability: 0.92, ats_alignment: 0.78, consistency: 0.95 },
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 80) return "#16a34a";
  if (s >= 60) return "#d97706";
  return "#dc2626";
}

function Ring({ score, size = 120 }) {
  const r = 48, cx = 60, cy = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color}
          strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="score-ring-label">
        <div className="score-num" style={{ color }}>{score}</div>
        <div className="score-denom">/100</div>
      </div>
    </div>
  );
}

const PIPELINE_STEPS = [
  "Ingesting documents",
  "Parsing resume",
  "Analyzing job description",
  "Computing skill gap",
  "Rewriting bullets",
  "Generating interview prep",
  "Running evaluation",
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("input");
  const [resultTab, setResultTab] = useState("ats");
  const [jd, setJd] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef();

  async function handleAnalyze() {
    if (!jd.trim() || (!resumeText.trim() && !resumeFile)) return;
    setLoading(true);
    setResult(null);
    setProgress(0);
    setCurrentStep(0);

    // Simulate pipeline progress
    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      setCurrentStep(i);
      setProgress(Math.round(((i + 1) / PIPELINE_STEPS.length) * 95));
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
    }

    // In production: fetch('http://localhost:8000/analyze', { method: 'POST', ... })
    // For demo, use mock data
    setProgress(100);
    await new Promise(r => setTimeout(r, 400));
    setResult(MOCK_RESULT);
    setLoading(false);
    setTab("results");
    setResultTab("ats");
  }

  function handleDrop(e) {
    e.preventDefault(); setDragover(false);
    const f = e.dataTransfer.files[0];
    if (f) setResumeFile(f);
  }

  const r = result?.results;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="logo-dot" />
            ApplyOS
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
              v1.0 · multi-agent
            </span>
          </div>
          <nav className="nav">
            {["input","results"].map(t => (
              <button key={t} className={`nav-chip ${tab===t?"active":""}`} onClick={() => setTab(t)}>
                {t === "input" ? "⬆ New Analysis" : "📊 Results"}
              </button>
            ))}
          </nav>
        </header>

        {/* Main */}
        <main className="main">
          {tab === "input" && (
            <div className="fade-in">
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: -0.5 }}>
                  Agentic Job Intelligence
                </h1>
                <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 6 }}>
                  Multi-agent RAG pipeline · LangGraph orchestration · Evidence-grounded outputs
                </p>
              </div>

              <div className="upload-grid">
                {/* Resume upload */}
                <div className="input-card">
                  <div className="card-label">
                    <span className="card-label-num">1</span>
                    Resume
                  </div>
                  <div
                    className={`drop-zone ${dragover ? "dragover" : ""}`}
                    onClick={() => fileRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragover(true); }}
                    onDragLeave={() => setDragover(false)}
                    onDrop={handleDrop}
                  >
                    <div className="drop-icon">📄</div>
                    <div className="drop-text"><strong>Drop or click</strong> to upload</div>
                    <div className="drop-sub">PDF · DOCX · TXT</div>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" hidden
                      onChange={e => setResumeFile(e.target.files[0])} />
                  </div>
                  {resumeFile && (
                    <div className="file-attached">
                      ✓ {resumeFile.name}
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                      — or paste text —
                    </div>
                    <textarea
                      rows={5} placeholder="Paste your resume here..."
                      value={resumeText} onChange={e => setResumeText(e.target.value)}
                      style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--cream)" }}
                    />
                  </div>
                </div>

                {/* Job description */}
                <div className="input-card">
                  <div className="card-label">
                    <span className="card-label-num">2</span>
                    Job Description
                  </div>
                  <textarea
                    rows={16}
                    placeholder="Paste the full job posting here — the more text, the better the analysis…"
                    value={jd} onChange={e => setJd(e.target.value)}
                  />
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {jd.length} chars · ~{Math.round(jd.split(/\s+/).length)} words
                  </div>
                </div>
              </div>

              {/* Optional company doc row */}
              <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
                  Optional: company docs
                </span>
                <button style={{ padding: "6px 14px", borderRadius: 8, border: "1px dashed var(--border)", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--muted)" }}>
                  + Upload company PDF / notes
                </button>
              </div>

              {/* Pipeline viz */}
              {loading && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
                    🤖 Running multi-agent pipeline…
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="progress-steps">
                    {PIPELINE_STEPS.map((s, i) => (
                      <span key={i} className={`step-chip ${i < currentStep ? "done" : i === currentStep ? "active" : ""}`}>
                        {i < currentStep ? "✓ " : ""}{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                className={`analyze-btn ${loading ? "loading" : ""}`}
                onClick={handleAnalyze}
                disabled={loading || (!jd.trim()) || (!resumeText.trim() && !resumeFile)}
              >
                <span>{loading ? "Analyzing…" : "⚡ Run ApplyOS Analysis"}</span>
              </button>

              <p style={{ textAlign: "center", fontSize: 11, color: "var(--muted)", marginTop: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                LangGraph · ChromaDB · GPT-4o · RAG · Structured outputs
              </p>
            </div>
          )}

          {tab === "results" && !result && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No analysis yet</div>
              <div className="empty-sub">Run an analysis first by uploading your resume and a job description.</div>
              <button className="analyze-btn" style={{ width: "auto", padding: "12px 28px" }}
                onClick={() => setTab("input")}>
                <span>← Go to Input</span>
              </button>
            </div>
          )}

          {tab === "results" && result && (
            <div className="results fade-in">
              {/* Result header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22 }}>
                    {r.job_profile?.job_title} @ {r.job_profile?.company_name}
                  </h2>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                    Session {result.session_id} · Quality score {Math.round(result.overall_quality_score * 100)}%
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {result.errors.length === 0 && (
                    <span style={{ padding: "4px 12px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, fontSize: 12, color: "var(--success)" }}>
                      ✓ No errors
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs">
                {[
                  ["ats", "🎯 ATS Score"],
                  ["gaps", "⚠️ Skill Gaps"],
                  ["bullets", "✍️ Bullets"],
                  ["interview", "🎤 Interview Prep"],
                  ["eval", "📊 Quality Eval"],
                ].map(([id, label]) => (
                  <button key={id} className={`tab ${resultTab===id?"active":""}`}
                    onClick={() => setResultTab(id)}>{label}</button>
                ))}
              </div>

              {/* ATS Score */}
              {resultTab === "ats" && (
                <div className="fade-in">
                  <div className="ats-hero">
                    <Ring score={r.skill_gap_report.ats_score.total_score} />
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 16 }}>
                        ATS Match Score Breakdown
                      </div>
                      <div className="ats-breakdown">
                        {[
                          ["Required Skills", r.skill_gap_report.ats_score.required_skills_score, 50, "#e84545"],
                          ["Preferred Skills", r.skill_gap_report.ats_score.preferred_skills_score, 25, "#2563eb"],
                          ["Keyword Coverage", r.skill_gap_report.ats_score.keyword_coverage_score, 15, "#d4a847"],
                          ["Experience Match", r.skill_gap_report.ats_score.experience_alignment_score, 10, "#16a34a"],
                        ].map(([label, val, max, color]) => (
                          <div key={label} className="breakdown-item">
                            <div className="breakdown-label">{label}</div>
                            <div className="breakdown-bar">
                              <div className="breakdown-fill" style={{ width: `${(val/max)*100}%`, background: color }} />
                            </div>
                            <div className="breakdown-val">{val}/{max}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 16 }}>
                    <div className="section-header">
                      <div className="section-title">Skill Match Overview</div>
                    </div>
                    <div className="skill-grid">
                      {r.skill_gap_report.skill_matches.map((m, i) => (
                        <div key={i} className={`skill-tag ${m.status}`}>
                          <span className="skill-dot" />
                          {m.skill}
                          <span style={{ fontSize: 10, opacity: 0.7 }}>({m.importance})</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Verdict</div>
                      <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7 }}>
                        {r.skill_gap_report.overall_verdict}
                      </p>
                    </div>
                  </div>

                  <div className="quick-wins" style={{ marginTop: 16 }}>
                    <div className="section-header">
                      <div className="section-title" style={{ fontSize: 15 }}>⚡ Top 3 Quick Wins</div>
                    </div>
                    {r.skill_gap_report.top_3_quick_wins.map((w, i) => (
                      <div key={i} className="quick-win-item">
                        <div className="qw-num">{i+1}</div>
                        <div className="qw-text">{w}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skill Gaps */}
              {resultTab === "gaps" && (
                <div className="fade-in">
                  <div className="card">
                    <div className="section-header">
                      <div className="section-title">Skill Gaps</div>
                      <div className="section-meta">{r.skill_gap_report.gaps.length} identified</div>
                    </div>
                    <div className="gap-list">
                      {r.skill_gap_report.gaps.map((g, i) => (
                        <div key={i} className="gap-item">
                          <div className="gap-icon">{g.importance === "required" ? "🔴" : "🟡"}</div>
                          <div>
                            <div className="gap-skill">{g.skill}</div>
                            <div className="gap-rec">{g.recommendation}</div>
                          </div>
                          <div className={`effort-badge ${g.effort}`}>{g.effort}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card" style={{ marginTop: 16 }}>
                    <div className="section-title" style={{ fontSize: 15, marginBottom: 12 }}>ATS Keyword Coverage</div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 600, marginBottom: 6 }}>
                        ✓ Present in resume
                      </div>
                      <div className="skill-grid">
                        {r.skill_gap_report.keyword_hits.map((k, i) => (
                          <span key={i} style={{ padding: "3px 10px", background: "#f0fdf4", borderRadius: 12, fontSize: 11, color: "var(--success)", fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--gap)", fontWeight: 600, marginBottom: 6 }}>
                        ✗ Missing from resume
                      </div>
                      <div className="skill-grid">
                        {r.skill_gap_report.keyword_misses.map((k, i) => (
                          <span key={i} style={{ padding: "3px 10px", background: "#fef2f2", borderRadius: 12, fontSize: 11, color: "var(--gap)", fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bullets */}
              {resultTab === "bullets" && (
                <div className="fade-in">
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Rewritten Summary</div>
                    <div className="bullet-rewritten" style={{ fontSize: 14, lineHeight: 1.7 }}>
                      {r.bullet_rewrite_report.summary_rewrite}
                    </div>
                  </div>

                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Skills Section Order</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--tag-color)", background: "var(--tag-bg)", padding: "10px 14px", borderRadius: 8 }}>
                      {r.bullet_rewrite_report.skills_section_suggestion}
                    </div>
                  </div>

                  {r.bullet_rewrite_report.roles.map((role, ri) => (
                    <div key={ri} className="card bullet-role" style={{ marginBottom: 16 }}>
                      <div className="role-header">
                        {role.title}
                        <span className="role-badge">{role.company}</span>
                      </div>
                      {role.bullets.map((b, bi) => (
                        <div key={bi} className="bullet-pair">
                          {b.original && (
                            <div className="bullet-original">Before: {b.original}</div>
                          )}
                          <div className="bullet-rewritten">→ {b.rewritten}</div>
                          <div className="kw-chips">
                            {b.keywords_added.map((k, ki) => (
                              <span key={ki} className="kw-chip">{k}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  <div className="card">
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Cover Letter Opener</div>
                    <div className="pitch-box">{r.bullet_rewrite_report.cover_letter_opener}</div>
                  </div>
                </div>
              )}

              {/* Interview Prep */}
              {resultTab === "interview" && (
                <div className="fade-in">
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-header">
                      <div className="section-title">Behavioral Questions</div>
                      <div className="section-meta">{r.interview_prep_report.behavioral_questions.length} questions</div>
                    </div>
                    <div className="question-cards">
                      {r.interview_prep_report.behavioral_questions.map((q, i) => (
                        <div key={i} className="q-card">
                          <div className="q-category">
                            <span className="q-cat-dot behavioral" />behavioral
                          </div>
                          <div className="q-text">{q.question}</div>
                          <div className="q-hint">💡 {q.star_hint}</div>
                          <div className="star-scaffold">
                            {q.sample_answer_scaffold.split(/(\[SITUATION\]|\[TASK\]|\[ACTION\]|\[RESULT\])/).map((part, j) =>
                              /\[.+\]/.test(part) ? <span key={j} className="star-label">{part} </span> : <span key={j}>{part}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-header">
                      <div className="section-title">Technical Questions</div>
                    </div>
                    <div className="question-cards">
                      {r.interview_prep_report.technical_questions.map((q, i) => (
                        <div key={i} className="q-card">
                          <div className="q-category">
                            <span className="q-cat-dot technical" />technical
                          </div>
                          <div className="q-text">{q.question}</div>
                          <div className="q-hint">💡 {q.star_hint}</div>
                          <div className="star-scaffold">
                            {q.sample_answer_scaffold.split(/(\[SITUATION\]|\[TASK\]|\[ACTION\]|\[RESULT\])/).map((part, j) =>
                              /\[.+\]/.test(part) ? <span key={j} className="star-label">{part} </span> : <span key={j}>{part}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-header">
                      <div className="section-title">Company Talking Points</div>
                    </div>
                    <div className="tp-list">
                      {r.interview_prep_report.company_talking_points.map((tp, i) => (
                        <div key={i} className="tp-item">
                          <div className="tp-topic">{tp.topic}</div>
                          <div className="tp-point">{tp.point}</div>
                          <div className="tp-source">📎 {tp.source}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-header">
                      <div className="section-title">Questions to Ask</div>
                    </div>
                    {r.interview_prep_report.questions_to_ask.map((q, i) => (
                      <div key={i} style={{ padding: "12px 0", borderBottom: i < r.interview_prep_report.questions_to_ask.length-1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>"{q.question}"</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>→ {q.why_smart}</div>
                      </div>
                    ))}
                  </div>

                  {r.interview_prep_report.red_flags_to_address.length > 0 && (
                    <div className="flags-box" style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 8 }}>⚠️ Red Flags to Address</div>
                      {r.interview_prep_report.red_flags_to_address.map((f, i) => (
                        <div key={i} className="flag-item">• {f}</div>
                      ))}
                    </div>
                  )}

                  <div className="card">
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Closing Pitch (30-second)</div>
                    <div className="pitch-box">{r.interview_prep_report.closing_pitch}</div>
                  </div>
                </div>
              )}

              {/* Quality Eval */}
              {resultTab === "eval" && (
                <div className="fade-in">
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div className="section-header">
                      <div className="section-title">Output Quality Rubric</div>
                      <div className="section-meta">rule-based · deterministic</div>
                    </div>
                    <div className="eval-grid">
                      {Object.entries(r.rubric_scores).map(([key, val]) => (
                        <div key={key} className="eval-card">
                          <div className="eval-metric">{key}</div>
                          <div className="eval-score" style={{ color: scoreColor(val * 100) }}>
                            {Math.round(val * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {r.hallucination_flags.length > 0 ? (
                    <div className="flags-box">
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#92400e", marginBottom: 8 }}>
                        ⚠️ Hallucination Flags ({r.hallucination_flags.length})
                      </div>
                      {r.hallucination_flags.map((f, i) => (
                        <div key={i} className="flag-item">• {f}</div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, fontSize: 13, color: "var(--success)" }}>
                      ✓ Hallucination checker passed — all outputs grounded in source documents
                    </div>
                  )}

                  <div className="card" style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Architecture</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--muted)", lineHeight: 2 }}>
                      {[
                        "▸ Orchestration     LangGraph StateGraph (parallel nodes)",
                        "▸ LLM               GPT-4o (structured output via function calling)",
                        "▸ Embeddings        text-embedding-3-small",
                        "▸ Vector Store      ChromaDB (pluggable: FAISS / Pinecone)",
                        "▸ RAG               Multi-namespace retriever + chunk fusion",
                        "▸ Evaluation        Rule-based rubric + LLM judge (GPT-4o-mini)",
                        "▸ Backend           FastAPI + SQLAlchemy + PostgreSQL",
                        "▸ Output            Pydantic v2 structured schemas per agent",
                      ].map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
