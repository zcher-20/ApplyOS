import { useState, useRef } from "react";

const CSS = `
  

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --white: #ffffff;
    --bg: #ffffff;
    --bg2: #f5f5f7;
    --pink: #f2c4ce;
    --pink-soft: #fce8ec;
    --pink-mid: #e8a0b0;
    --brown: #8b6f5e;
    --brown-light: #c4a898;
    --brown-dark: #5c4538;
    --grey: #9a9590;
    --grey-light: #e8e4e0;
    --grey-dark: #4a4540;
    --text: #2d2420;
    --text-muted: #8a7f7a;
    --border: rgba(0,0,0,0.08);
    --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);
    --shadow-lg: 0 8px 40px rgba(92,69,56,0.12);
    --success: #7a9e7e;
    --warning: #c4956a;
    --danger: #c47a7a;
    --radius: 18px;
    --radius-sm: 10px;
  }

  body {
    font-family: -apple-system, 'SF Pro Text', sans-serif;
    background: #ffffff;
    color: var(--text);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Layout ── */
  .app { min-height: 100vh; display: flex; flex-direction: column; }

  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px; height: 60px;
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(24px) saturate(180%);
    border-bottom: 1px solid var(--border);
    position: sticky; top: 0; z-index: 100;
  }

  .logo {
    font-family: -apple-system, 'SF Pro Display', sans-serif;
    font-weight: 600; font-size: 20px;
    color: var(--brown-dark);
    letter-spacing: -0.3px;
    display: flex; align-items: center; gap: 8px;
  }
  .logo-mark {
    width: 28px; height: 28px; border-radius: 8px;
    background: linear-gradient(135deg, var(--pink), var(--brown-light));
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }

  .nav { display: flex; gap: 6px; }
  .nav-btn {
    padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;
    background: transparent; border: 1px solid var(--border);
    color: var(--text-muted); cursor: pointer; transition: all 0.2s;
    font-family: -apple-system, 'SF Pro Text', sans-serif;
  }
  .nav-btn:hover { background: var(--pink-soft); border-color: var(--pink-mid); color: var(--brown-dark); }
  .nav-btn.active { background: var(--brown-dark); border-color: var(--brown-dark); color: white; }

  .main { flex: 1; max-width: 1100px; margin: 0 auto; width: 100%; padding: 36px 24px; }

  /* ── Hero ── */
  .hero { text-align: center; padding: 48px 0 40px; }
  .hero-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--pink-soft); border: 1px solid var(--pink);
    border-radius: 20px; padding: 4px 14px; margin-bottom: 18px;
    font-size: 12px; font-weight: 500; color: var(--brown);
    letter-spacing: 0.03em;
  }
  .hero-title {
    font-family: -apple-system, 'SF Pro Display', sans-serif;
    font-size: 42px; font-weight: 700; color: var(--brown-dark);
    letter-spacing: -1px; line-height: 1.15; margin-bottom: 12px;
  }
  .hero-title em { font-style: italic; color: var(--brown); }
  .hero-sub { font-size: 15px; color: var(--text-muted); font-weight: 300; }

  /* ── Cards ── */
  .card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 24px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04);
  }
  .card-subtitle {
    font-size: 14px; font-weight: 400; letter-spacing: 0;
    text-transform: none; color: var(--text-muted); margin-bottom: 10px;
    display: flex; align-items: center; gap: 6px;
  }
  .card-label-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: linear-gradient(135deg, var(--pink), var(--brown-light));
  }

  /* ── Input grid ── */
  .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

  .drop-zone {
    border: 1.5px dashed var(--grey-light); border-radius: var(--radius-sm);
    padding: 28px 20px; text-align: center; cursor: pointer;
    transition: all 0.25s; background: #ffffff;
  }
  .drop-zone:hover, .drop-zone.over {
    border-color: var(--pink-mid); background: var(--pink-soft);
  }
  .drop-icon { font-size: 26px; margin-bottom: 8px; }
  .drop-text { font-size: 13px; color: var(--text-muted); }
  .drop-text strong { color: var(--brown); }
  .drop-hint { font-size: 11px; color: var(--grey); margin-top: 3px; font-family: 'SF Mono', monospace; }

  .file-pill {
    display: inline-flex; align-items: center; gap: 6px; margin-top: 10px;
    background: #edf7ee; border: 1px solid #b8debb; border-radius: 20px;
    padding: 4px 12px; font-size: 12px; color: var(--success);
  }

  textarea {
    width: 100%; border: none; background: transparent;
    font-family: -apple-system, 'SF Pro Text', sans-serif; font-size: 13px;
    color: var(--text); resize: none; outline: none; line-height: 1.7;
  }
  textarea::placeholder { color: var(--grey); }

  /* ── CTA ── */
  .cta-btn {
    width: 100%; padding: 15px; border-radius: var(--radius-sm);
    background: var(--brown-dark); color: white; border: none; cursor: pointer;
    font-family: -apple-system, 'SF Pro Text', sans-serif; font-size: 15px; font-weight: 500;
    letter-spacing: 0.01em; transition: all 0.25s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .cta-btn:hover { background: var(--brown); transform: translateY(-1px); box-shadow: var(--shadow-lg); }
  .cta-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
  .cta-btn.running { background: var(--brown); animation: softpulse 2s ease-in-out infinite; }
  @keyframes softpulse { 0%,100%{opacity:1} 50%{opacity:0.75} }

  /* ── Pipeline progress ── */
  .pipeline {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px; margin-bottom: 16px;
  }
  .pipeline-title { font-size: 13px; font-weight: 500; color: var(--brown-dark); margin-bottom: 14px; }
  .progress-track { height: 4px; background: var(--grey-light); border-radius: 2px; overflow: hidden; margin-bottom: 14px; }
  .progress-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, var(--pink-mid), var(--brown-light));
    transition: width 0.8s ease;
  }
  .steps { display: flex; flex-wrap: wrap; gap: 6px; }
  .step {
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;
    border: 1px solid var(--grey-light); color: var(--grey);
    transition: all 0.3s; font-family: 'SF Mono', monospace;
  }
  .step.done { background: #edf7ee; border-color: #b8debb; color: var(--success); }
  .step.active { background: var(--pink-soft); border-color: var(--pink-mid); color: var(--brown); animation: stepblink 1.2s ease infinite; }
  @keyframes stepblink { 0%,100%{opacity:1} 50%{opacity:0.6} }

  /* ── Results ── */
  .results-header {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px 24px; margin-bottom: 16px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04);
  }
  .results-title { font-family: -apple-system, 'SF Pro Display', sans-serif; font-size: 22px; color: var(--brown-dark); }
  .results-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

  /* ── Tabs ── */
  .tabs {
    display: flex; gap: 4px; background: var(--white);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 5px; margin-bottom: 16px; box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04);
  }
  .tab {
    flex: 1; padding: 8px 10px; border-radius: var(--radius-sm); border: none;
    cursor: pointer; font-family: -apple-system, 'SF Pro Text', sans-serif; font-size: 12px; font-weight: 500;
    background: transparent; color: var(--text-muted); transition: all 0.2s; text-align: center;
  }
  .tab:hover { color: var(--brown-dark); background: var(--bg); }
  .tab.active {
    background: linear-gradient(135deg, var(--pink-soft), var(--bg2));
    color: var(--brown-dark); border: 1px solid var(--pink);
    box-shadow: 0 1px 6px rgba(139,111,94,0.1);
  }

  /* ── ATS Score ── */
  .ats-card {
    background: linear-gradient(135deg, #fff5f7 0%, #fdf8f5 50%, #f8f4f0 100%);
    border: 1px solid var(--pink); border-radius: var(--radius); padding: 28px;
    display: grid; grid-template-columns: 140px 1fr; gap: 28px; align-items: center;
    margin-bottom: 16px; box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.04);
  }
  .ring-wrap { position: relative; width: 130px; height: 130px; }
  .ring-wrap svg { transform: rotate(-90deg); }
  .ring-label {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .ring-score { font-family: -apple-system, 'SF Pro Display', sans-serif; font-size: 36px; color: var(--brown-dark); line-height: 1; }
  .ring-denom { font-size: 11px; color: var(--text-muted); font-family: 'SF Mono', monospace; }

  .breakdown-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .breakdown-row { }
  .breakdown-label { font-size: 11px; color: var(--text-muted); margin-bottom: 5px; }
  .breakdown-track { height: 5px; background: var(--grey-light); border-radius: 3px; overflow: hidden; }
  .breakdown-bar { height: 100%; border-radius: 3px; transition: width 1s ease; }
  .breakdown-val { font-family: 'SF Mono', monospace; font-size: 11px; color: var(--brown); margin-top: 3px; }

  /* ── Skill tags ── */
  .skill-wrap { display: flex; flex-wrap: wrap; gap: 7px; }
  .skill-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid;
  }
  .skill-pill.present { background: #edf7ee; border-color: #b8debb; color: #4a7a4e; }
  .skill-pill.partial { background: #fef6ec; border-color: #e8c49a; color: #8a5e30; }
  .skill-pill.missing { background: #fdf0f0; border-color: #e8aaaa; color: #8a4040; }
  .skill-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

  /* ── Gap items ── */
  .gap-item {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 16px 18px; margin-bottom: 10px;
    display: grid; grid-template-columns: 24px 1fr auto; gap: 12px; align-items: start;
    box-shadow: 0 1px 8px rgba(92,69,56,0.05);
  }
  .gap-icon { font-size: 16px; }
  .gap-skill { font-weight: 600; font-size: 14px; color: var(--brown-dark); margin-bottom: 4px; }
  .gap-rec { font-size: 13px; color: var(--text-muted); line-height: 1.55; }
  .effort {
    padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600;
    font-family: 'SF Mono', monospace; white-space: nowrap;
  }
  .effort.quick-win { background: #edf7ee; color: var(--success); }
  .effort.medium { background: #fef6ec; color: var(--warning); }
  .effort.long-term { background: #fdf0f0; color: var(--danger); }

  /* ── Quick wins ── */
  .wins-box {
    background: linear-gradient(135deg, #f0f7f1, #fff);
    border: 1px solid #c4dfc7; border-radius: var(--radius); padding: 20px; margin-top: 16px;
  }
  .wins-title { font-family: -apple-system, 'SF Pro Display', sans-serif; font-size: 16px; color: var(--brown-dark); margin-bottom: 14px; }
  .win-row {
    display: flex; gap: 12px; align-items: start; padding: 10px 0;
    border-bottom: 1px solid rgba(196,223,199,0.5);
  }
  .win-row:last-child { border-bottom: none; }
  .win-num {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--success); color: white; font-size: 11px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    font-family: 'SF Mono', monospace;
  }
  .win-text { font-size: 13px; line-height: 1.55; color: var(--text); }

  /* ── Bullets ── */
  .role-header {
    font-family: -apple-system, 'SF Pro Display', sans-serif; font-size: 15px; color: var(--brown-dark);
    padding: 10px 0; border-bottom: 1px solid var(--border); margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .role-tag {
    font-family: 'SF Mono', monospace; font-size: 10px; font-weight: 500;
    background: var(--pink-soft); color: var(--brown); padding: 2px 8px; border-radius: 10px;
    border: 1px solid var(--pink);
  }
  .bullet-before {
    font-size: 12px; color: var(--grey); padding: 8px 12px;
    background: var(--bg); border-radius: 6px; margin-bottom: 6px;
    font-family: 'SF Mono', monospace; line-height: 1.6;
    border-left: 2px solid var(--grey-light);
  }
  .bullet-after {
    font-size: 13px; padding: 10px 14px; border-radius: 8px; line-height: 1.65;
    background: var(--pink-soft); border: 1px solid var(--pink); border-left: 3px solid var(--pink-mid);
    color: var(--brown-dark);
  }
  .kw-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .kw { font-size: 10px; font-family: 'SF Mono', monospace; background: var(--bg2);
    color: var(--brown); padding: 2px 7px; border-radius: 8px; border: 1px solid var(--border); }

  .summary-box {
    background: linear-gradient(135deg, var(--pink-soft), var(--bg2));
    border: 1px solid var(--pink); border-radius: var(--radius-sm); padding: 16px;
    font-size: 14px; line-height: 1.7; color: var(--brown-dark); margin-bottom: 16px;
  }
  .skills-order {
    font-family: 'SF Mono', monospace; font-size: 12px; color: var(--brown);
    background: var(--bg); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);
    margin-bottom: 16px;
  }

  /* ── Interview ── */
  .q-card {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 18px; margin-bottom: 10px;
    box-shadow: 0 1px 8px rgba(92,69,56,0.05);
  }
  .q-tag {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 2px 10px; border-radius: 20px; margin-bottom: 8px; border: 1px solid;
  }
  .q-tag.behavioral { background: var(--pink-soft); border-color: var(--pink); color: var(--brown); }
  .q-tag.technical { background: #f0f0f8; border-color: #c0c0e0; color: #505090; }
  .q-tag.company { background: #fef8ec; border-color: #e8d4a0; color: #806020; }
  .q-text { font-size: 14px; font-weight: 500; color: var(--brown-dark); margin-bottom: 10px; line-height: 1.5; }
  .q-hint {
    font-size: 12px; color: var(--text-muted); background: #ffffff;
    padding: 8px 12px; border-radius: 8px; line-height: 1.55;
  }
  .star-block {
    margin-top: 8px; font-size: 12px; font-family: 'SF Mono', monospace;
    color: var(--text-muted); line-height: 1.8; padding: 8px 12px;
    background: var(--pink-soft); border-radius: 8px; border-left: 2px solid var(--pink-mid);
  }
  .star-kw { color: var(--brown); font-weight: 500; }

  /* ── Talking points ── */
  .tp-item {
    padding: 14px 16px; border-radius: var(--radius-sm); margin-bottom: 10px;
    background: #fffbf0; border: 1px solid #e8d8b0;
  }
  .tp-topic { font-weight: 600; font-size: 13px; color: #7a5a20; margin-bottom: 4px; }
  .tp-point { font-size: 13px; line-height: 1.55; }
  .tp-src { font-size: 11px; color: var(--grey); margin-top: 6px; font-family: 'SF Mono', monospace; }

  /* ── Pitch ── */
  .pitch {
    background: var(--brown-dark); color: rgba(255,255,255,0.9);
    border-radius: var(--radius); padding: 24px; font-size: 14px; line-height: 1.75;
    font-style: italic; position: relative; overflow: hidden;
  }
  .pitch::before {
    content: '"'; position: absolute; top: -12px; left: 16px;
    font-family: -apple-system, 'SF Pro Display', sans-serif; font-size: 100px;
    color: rgba(255,255,255,0.05); line-height: 1;
  }

  /* ── Eval ── */
  .eval-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
  .eval-cell {
    background: var(--white); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 16px; text-align: center;
    box-shadow: 0 1px 6px rgba(92,69,56,0.06);
  }
  .eval-label { font-size: 10px; color: var(--text-muted); margin-bottom: 6px; font-family: 'SF Mono', monospace; }
  .eval-val { font-family: -apple-system, 'SF Pro Display', sans-serif; font-size: 24px; }

  .arch-box {
    background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm);
    padding: 16px; font-family: 'SF Mono', monospace; font-size: 12px;
    color: var(--text-muted); line-height: 2.1; margin-top: 16px;
  }
  .arch-key { color: var(--brown); }

  /* ── Verdicts ── */
  .verdict-box {
    background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm);
    padding: 14px 16px; font-size: 13px; color: var(--text-muted); line-height: 1.65;
    margin-top: 16px;
  }

  .section-gap { margin-bottom: 16px; }
  .section-title { font-family: -apple-system, 'SF Pro Display', sans-serif; font-size: 17px; color: var(--brown-dark); margin-bottom: 12px; }

  .clean-flag {
    background: #edf7ee; border: 1px solid #b8debb; border-radius: var(--radius-sm);
    padding: 14px 16px; font-size: 13px; color: var(--success);
  }

  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  .fade-in { animation: fi 0.35s ease; }
  @keyframes fi { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }

  .empty {
    text-align: center; padding: 80px 40px;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
  }
  .empty-icon { font-size: 44px; }
  .empty-title { font-family: -apple-system, 'SF Pro Display', sans-serif; font-size: 22px; color: var(--brown-dark); }
  .empty-sub { font-size: 14px; color: var(--text-muted); max-width: 360px; line-height: 1.6; }
`;

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK = {
  session_id: "demo-001",
  ats_score: 72,
  overall_quality_score: 0.84,
  errors: [],
  results: {
    job_profile: { job_title: "Senior Software Engineer", company_name: "Stripe", seniority: "Senior", ats_keywords: ["Python","distributed systems","API design","PostgreSQL","Kubernetes","gRPC","reliability","SLO","incident response"] },
    skill_gap_report: {
      ats_score: { required_skills_score: 38, preferred_skills_score: 18, keyword_coverage_score: 10, experience_alignment_score: 6, total_score: 72 },
      skill_matches: [
        { skill: "Python", status: "present", importance: "required", candidate_evidence: "5+ years Python" },
        { skill: "Distributed Systems", status: "present", importance: "required", candidate_evidence: "Led monolith → microservices migration" },
        { skill: "PostgreSQL", status: "present", importance: "required", candidate_evidence: "50M-row DB schema design" },
        { skill: "Kubernetes", status: "partial", importance: "required", candidate_evidence: "Used in CI, no prod ownership" },
        { skill: "gRPC", status: "missing", importance: "required", candidate_evidence: "" },
        { skill: "Kafka", status: "partial", importance: "preferred", candidate_evidence: "Familiar with pub-sub, no direct exp" },
        { skill: "Go", status: "missing", importance: "preferred", candidate_evidence: "" },
      ],
      gaps: [
        { skill: "gRPC", importance: "required", recommendation: "Complete gRPC quickstart + build a toy bidirectional streaming service. Add to GitHub within 2 weeks.", effort: "quick-win" },
        { skill: "Kubernetes production ownership", importance: "required", recommendation: "Take CKA exam prep; deploy a personal project to GKE with HPA and PodDisruptionBudget.", effort: "medium" },
        { skill: "Go", importance: "preferred", recommendation: "Work through the Go tour. Stripe uses Go heavily for their core platform.", effort: "long-term" },
      ],
      top_3_quick_wins: [
        "Add 'Kubernetes' to skills — you have partial experience that qualifies, just under-represented",
        "Build a gRPC toy service (2–4 hours) and push to GitHub before applying",
        "Rewrite Acme Corp bullets to emphasize latency and reliability outcomes",
      ],
      keyword_hits: ["Python","distributed systems","API design","PostgreSQL","reliability"],
      keyword_misses: ["Kubernetes","gRPC","SLO","incident response","Kafka"],
      overall_verdict: "Strong candidate with solid backend fundamentals. Missing gRPC experience and limited Kubernetes production depth are the main gaps. With 2–3 quick fixes, this profile could score 85+. The resume currently buries the most relevant distributed-systems work — surface it explicitly.",
    },
    bullet_rewrite_report: {
      summary_rewrite: "Senior Software Engineer with 6 years designing and scaling distributed backend systems in Python, targeting Stripe's infrastructure team. Proven track record improving API reliability and database performance at scale.",
      skills_section_suggestion: "Python · PostgreSQL · Distributed Systems · REST API Design · Kubernetes · Redis · Docker · CI/CD · System Design",
      cover_letter_opener: "Stripe's API-first culture and the challenge of moving money reliably for millions of businesses is exactly the kind of high-stakes infrastructure problem I've been preparing for.",
      roles: [{
        company: "Acme Corp", title: "Software Engineer II",
        bullets: [
          { original: "Responsible for improving database performance", rewritten: "Reduced P99 query latency by 60% on a 50M-row PostgreSQL database by redesigning indexes and introducing read replicas — improving checkout reliability from 99.2% to 99.9% uptime.", keywords_added: ["PostgreSQL","reliability","latency"], is_new: false },
          { original: "Worked on microservices migration", rewritten: "Architected and led migration of a 200k-LOC Python monolith to 12 microservices, cutting deployment frequency from biweekly to 40+ deploys/day.", keywords_added: ["Python","distributed systems","API design"], is_new: false },
        ]
      }]
    },
    interview_prep_report: {
      behavioral_questions: [
        { question: "Tell me about a time you improved system reliability under pressure.", category: "behavioral", why_likely: "Stripe is obsessed with reliability; your gap in formal SLO experience will be probed.", star_hint: "Use your Acme DB optimization story — 99.2% → 99.9% uptime is concrete.", sample_answer_scaffold: "[SITUATION] Our payment processing DB was degrading under peak load. [TASK] I owned the investigation and fix while keeping the system live. [ACTION] Analyzed slow query log, redesigned 3 composite indexes, added a read replica. [RESULT] P99 latency dropped 60%, uptime improved to 99.9%." },
        { question: "Describe a disagreement with an engineer on your team and how you resolved it.", category: "behavioral", why_likely: "Stripe values intellectual humility and directness.", star_hint: "The microservices architecture debate — synchronous vs async.", sample_answer_scaffold: "[SITUATION] Disagreed on sync vs async comms between services. [TASK] Build consensus without slowing the project. [ACTION] Ran a design session with prod latency data. [RESULT] Hybrid approach chosen; reduced coupling while meeting SLA." },
      ],
      technical_questions: [
        { question: "How would you design a distributed rate-limiting system for a payments API at 1M RPS?", category: "technical", why_likely: "Tests your distributed systems depth directly relevant to Stripe's core API.", star_hint: "Mention token bucket, sliding window, Redis Lua scripts.", sample_answer_scaffold: "[SITUATION] Design question. [TASK] Describe architecture. [ACTION] Token bucket in Redis + consistent hashing for sharding + local fallback. [RESULT] 1M RPS with <5ms overhead." },
      ],
      company_specific_questions: [
        { question: "Stripe recently launched Stablecoin Financial Accounts — how does that change infrastructure challenges?", category: "company", why_likely: "Shows you follow Stripe's roadmap and think about infra implications.", star_hint: "Research Stripe's stablecoin announcement; connect to distributed consistency.", sample_answer_scaffold: "[SITUATION] Stripe expanding to crypto-native products. [TASK] Discuss infra implications. [ACTION] Settlement finality, cross-chain reconciliation, novel reliability requirements. [RESULT] Apply reliability work to new domain." },
      ],
      company_talking_points: [
        { topic: "API Design Philosophy", point: "Stripe treats API design as a product — every endpoint is a long-term commitment. Mention that you approach API contracts with the same mindset, citing your versioning work.", source: "Stripe Engineering Blog" },
        { topic: "Reliability Culture", point: "Stripe runs blameless postmortems and tracks SLOs rigorously. Frame your DB optimization work explicitly as an SLO improvement.", source: "Stripe Engineering values" },
      ],
      questions_to_ask: [
        { question: "How does the team balance velocity against reliability SLOs on the core payments API?", why_smart: "Shows you understand the core engineering tradeoff at a payments company." },
        { question: "What does the on-call rotation look like, and how has incident volume changed over the past year?", why_smart: "Signals you're serious about operational responsibility." },
      ],
      red_flags_to_address: [
        "Limited formal Kubernetes production ownership — preemptively mention your CKA prep",
        "No gRPC on resume — address by having a gRPC project live on GitHub before the interview",
      ],
      closing_pitch: "I've spent 6 years building high-reliability, high-scale backend systems — and I'm excited to bring that foundation to a team where the correctness of every transaction genuinely matters. I'm confident I can contribute immediately to your infra reliability work.",
    },
    hallucination_flags: [],
    rubric_scores: { completeness: 1.0, specificity: 0.87, actionability: 0.92, ats_alignment: 0.78, consistency: 0.95 },
  }
};

const STEPS = ["Ingesting documents","Parsing resume","Analyzing job","Computing skill gap","Rewriting bullets","Interview prep","Evaluating outputs"];

function scoreColor(s) {
  if (s >= 80) return "#7a9e7e";
  if (s >= 60) return "#c4956a";
  return "#c47a7a";
}

function Ring({ score }) {
  const r = 52, cx = 65, cy = 65, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 130 130" width={130} height={130}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0ece8" strokeWidth="9"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color}
          strokeWidth="9" strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{transition:"stroke-dashoffset 1.2s ease"}}/>
      </svg>
      <div className="ring-label">
        <div className="ring-score" style={{color}}>{score}</div>
        <div className="ring-denom">/100</div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("input");
  const [rtab, setRtab] = useState("ats");
  const [jd, setJd] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef();

  async function analyze() {
    if (!jd.trim() || (!resumeText.trim() && !file)) return;
    setLoading(true); setResult(null); setProgress(0); setStep(0);
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i); setProgress(Math.round(((i+1)/STEPS.length)*95));
      await new Promise(r => setTimeout(r, 650 + Math.random()*450));
    }
    setProgress(100);
    await new Promise(r => setTimeout(r, 300));
    setResult(MOCK); setLoading(false); setView("results"); setRtab("ats");
  }

  const r = result?.results;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <header className="header">
          <div className="logo">
            <div className="logo-mark">✦</div>
            ApplyOS
          </div>
          <nav className="nav">
            <button className={`nav-btn ${view==="input"?"active":""}`} onClick={()=>setView("input")}>New Analysis</button>
            <button className={`nav-btn ${view==="results"?"active":""}`} onClick={()=>setView("results")}>Results</button>
          </nav>
        </header>

        <main className="main">
          {view === "input" && (
            <div className="fade-in">
              <div className="hero">
                
                <h1 className="hero-title">Your resume, <em>intelligently</em> matched.</h1>
                <p className="hero-sub">ATS Scoring · Skill Gap Analysis · Tailored Bullets · Interview Prep</p>
              </div>

              <div className="input-grid"><div style={{gridColumn:"1",textAlign:"center",fontWeight:600,fontSize:15,color:"var(--brown-dark)",marginBottom:"-8px",paddingBottom:"8px"}}>Resume</div><div style={{gridColumn:"2",textAlign:"center",fontWeight:600,fontSize:15,color:"var(--brown-dark)",marginBottom:"-8px",paddingBottom:"8px"}}>Job Description</div></div><div className="input-grid">
                <div className="card">
                  
                  <div className={`drop-zone ${over?"over":""}`}
                    onClick={()=>fileRef.current.click()}
                    onDragOver={e=>{e.preventDefault();setOver(true)}}
                    onDragLeave={()=>setOver(false)}
                    onDrop={e=>{e.preventDefault();setOver(false);setFile(e.dataTransfer.files[0])}}>
                    <div className="drop-icon">📄</div>
                    <div className="drop-text"><strong>Drop or click</strong> to upload</div>
                    <div className="drop-hint">PDF · DOCX · TXT</div>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={e=>setFile(e.target.files[0])}/>
                  </div>
                  {file && <div className="file-pill">✓ {file.name}</div>}
                  <div className="divider"/>
                  
                  <textarea rows={6} placeholder="Paste your resume here…" value={resumeText} onChange={e=>setResumeText(e.target.value)}/>
                </div>

                <div className="card">
                  
                  <textarea rows={16} placeholder="Paste the full job posting here — the more detail, the better the analysis…" value={jd} onChange={e=>setJd(e.target.value)}/>
                  <div style={{fontSize:11,color:"var(--grey)",marginTop:8,fontFamily:"'DM Mono',monospace"}}>
                    {jd.split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>
              </div>

              {loading && (
                <div className="pipeline">
                  <div className="pipeline-title">Running pipeline…</div>
                  <div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div>
                  <div className="steps">
                    {STEPS.map((s,i)=>(
                      <span key={i} className={`step ${i<step?"done":i===step?"active":""}`}>
                        {i<step?"✓ ":""}{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button className={`cta-btn ${loading?"running":""}`} onClick={analyze}
                disabled={loading||!jd.trim()||(!resumeText.trim()&&!file)}>
                {loading ? "Analyzing…" : "✦ Run Analysis"}
              </button>
            </div>
          )}

          {view === "results" && !result && (
            <div className="empty fade-in">
              <div className="empty-icon">✦</div>
              <div className="empty-title">No analysis yet</div>
              <div className="empty-sub">Run an analysis first by uploading your resume and a job description.</div>
              <button className="cta-btn" style={{width:"auto",padding:"12px 28px"}} onClick={()=>setView("input")}>← Go to Input</button>
            </div>
          )}

          {view === "results" && result && (
            <div className="fade-in">
              <div className="results-header">
                <div>
                  <div className="results-title">{r.job_profile?.job_title} · {r.job_profile?.company_name}</div>
                  <div className="results-meta">Session {result.session_id} · Quality {Math.round(result.overall_quality_score*100)}%</div>
                </div>
                <div style={{fontSize:12,color:"var(--success)",background:"#edf7ee",border:"1px solid #b8debb",borderRadius:20,padding:"4px 12px"}}>
                  ✓ Complete
                </div>
              </div>

              <div className="tabs">
                {[["ats","🎯 ATS Score"],["gaps","⚠︎ Skill Gaps"],["bullets","✍︎ Bullets"],["interview","🎤 Interview"],["eval","◎ Quality"]].map(([id,label])=>(
                  <button key={id} className={`tab ${rtab===id?"active":""}`} onClick={()=>setRtab(id)}>{label}</button>
                ))}
              </div>

              {rtab==="ats" && (
                <div className="fade-in">
                  <div className="ats-card">
                    <Ring score={r.skill_gap_report.ats_score.total_score}/>
                    <div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"var(--brown-dark)",marginBottom:14}}>Score Breakdown</div>
                      <div className="breakdown-grid">
                        {[
                          ["Required Skills",r.skill_gap_report.ats_score.required_skills_score,50,"#e8a0b0"],
                          ["Preferred Skills",r.skill_gap_report.ats_score.preferred_skills_score,25,"#c4a898"],
                          ["Keyword Coverage",r.skill_gap_report.ats_score.keyword_coverage_score,15,"#a0b8d0"],
                          ["Experience Match",r.skill_gap_report.ats_score.experience_alignment_score,10,"#a0c0a0"],
                        ].map(([label,val,max,color])=>(
                          <div key={label} className="breakdown-row">
                            <div className="breakdown-label">{label}</div>
                            <div className="breakdown-track"><div className="breakdown-bar" style={{width:`${(val/max)*100}%`,background:color}}/></div>
                            <div className="breakdown-val">{val}/{max}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card section-gap">
                    <div className="section-title">Skill Match</div>
                    <div className="skill-wrap">
                      {r.skill_gap_report.skill_matches.map((m,i)=>(
                        <span key={i} className={`skill-pill ${m.status}`}>
                          <span className="skill-dot"/>
                          {m.skill}
                          <span style={{fontSize:10,opacity:0.6}}>({m.importance})</span>
                        </span>
                      ))}
                    </div>
                    <div className="verdict-box">{r.skill_gap_report.overall_verdict}</div>
                  </div>

                  <div className="wins-box">
                    <div className="wins-title">Quick Wins</div>
                    {r.skill_gap_report.top_3_quick_wins.map((w,i)=>(
                      <div key={i} className="win-row">
                        <div className="win-num">{i+1}</div>
                        <div className="win-text">{w}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rtab==="gaps" && (
                <div className="fade-in">
                  <div className="card section-gap">
                    <div className="section-title">Skill Gaps · {r.skill_gap_report.gaps.length} identified</div>
                    {r.skill_gap_report.gaps.map((g,i)=>(
                      <div key={i} className="gap-item">
                        <div className="gap-icon">{g.importance==="required"?"🔴":"🟡"}</div>
                        <div>
                          <div className="gap-skill">{g.skill}</div>
                          <div className="gap-rec">{g.recommendation}</div>
                        </div>
                        <span className={`effort ${g.effort}`}>{g.effort}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <div className="section-title">Keyword Coverage</div>
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,color:"var(--success)",fontWeight:600,marginBottom:6}}>✓ Present</div>
                      <div className="skill-wrap">
                        {r.skill_gap_report.keyword_hits.map((k,i)=>(
                          <span key={i} style={{padding:"3px 10px",background:"#edf7ee",borderRadius:20,fontSize:11,color:"var(--success)",fontFamily:"'DM Mono',monospace"}}>{k}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"var(--danger)",fontWeight:600,marginBottom:6}}>✗ Missing</div>
                      <div className="skill-wrap">
                        {r.skill_gap_report.keyword_misses.map((k,i)=>(
                          <span key={i} style={{padding:"3px 10px",background:"#fdf0f0",borderRadius:20,fontSize:11,color:"var(--danger)",fontFamily:"'DM Mono',monospace"}}>{k}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {rtab==="bullets" && (
                <div className="fade-in">
                  <div className="card section-gap">
                    <div className="card-subtitle">Rewritten Summary</div>
                    <div className="summary-box">{r.bullet_rewrite_report.summary_rewrite}</div>
                    <div className="card-subtitle">Skills Order</div>
                    <div className="skills-order">{r.bullet_rewrite_report.skills_section_suggestion}</div>
                    <div className="card-subtitle">Cover Letter Opener</div>
                    <div className="pitch" style={{fontSize:13}}>{r.bullet_rewrite_report.cover_letter_opener}</div>
                  </div>
                  {r.bullet_rewrite_report.roles.map((role,ri)=>(
                    <div key={ri} className="card section-gap">
                      <div className="role-header">{role.title}<span className="role-tag">{role.company}</span></div>
                      {role.bullets.map((b,bi)=>(
                        <div key={bi} style={{marginBottom:14}}>
                          {b.original && <div className="bullet-before">Before: {b.original}</div>}
                          <div className="bullet-after">→ {b.rewritten}</div>
                          <div className="kw-row">{b.keywords_added.map((k,ki)=><span key={ki} className="kw">{k}</span>)}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {rtab==="interview" && (
                <div className="fade-in">
                  <div className="card section-gap">
                    <div className="section-title">Behavioral Questions</div>
                    {r.interview_prep_report.behavioral_questions.map((q,i)=>(
                      <div key={i} className="q-card">
                        <span className="q-tag behavioral">behavioral</span>
                        <div className="q-text">{q.question}</div>
                        <div className="q-hint">💡 {q.star_hint}</div>
                        <div className="star-block">
                          {q.sample_answer_scaffold.split(/(\[SITUATION\]|\[TASK\]|\[ACTION\]|\[RESULT\])/).map((p,j)=>
                            /\[.+\]/.test(p)?<span key={j} className="star-kw">{p} </span>:<span key={j}>{p}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="card section-gap">
                    <div className="section-title">Technical Questions</div>
                    {r.interview_prep_report.technical_questions.map((q,i)=>(
                      <div key={i} className="q-card">
                        <span className="q-tag technical">technical</span>
                        <div className="q-text">{q.question}</div>
                        <div className="q-hint">💡 {q.star_hint}</div>
                        <div className="star-block">
                          {q.sample_answer_scaffold.split(/(\[SITUATION\]|\[TASK\]|\[ACTION\]|\[RESULT\])/).map((p,j)=>
                            /\[.+\]/.test(p)?<span key={j} className="star-kw">{p} </span>:<span key={j}>{p}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="card section-gap">
                    <div className="section-title">Company Talking Points</div>
                    {r.interview_prep_report.company_talking_points.map((tp,i)=>(
                      <div key={i} className="tp-item">
                        <div className="tp-topic">{tp.topic}</div>
                        <div className="tp-point">{tp.point}</div>
                        <div className="tp-src">📎 {tp.source}</div>
                      </div>
                    ))}
                  </div>
                  <div className="card section-gap">
                    <div className="section-title">Questions to Ask</div>
                    {r.interview_prep_report.questions_to_ask.map((q,i)=>(
                      <div key={i} style={{padding:"12px 0",borderBottom:i<r.interview_prep_report.questions_to_ask.length-1?"1px solid var(--border)":"none"}}>
                        <div style={{fontWeight:500,fontSize:14,marginBottom:4,color:"var(--brown-dark)"}}>"{q.question}"</div>
                        <div style={{fontSize:12,color:"var(--text-muted)"}}>→ {q.why_smart}</div>
                      </div>
                    ))}
                    <div className="divider"/>
                    <div className="section-title" style={{fontSize:15}}>Closing Pitch</div>
                    <div className="pitch">{r.interview_prep_report.closing_pitch}</div>
                  </div>
                </div>
              )}

              {rtab==="eval" && (
                <div className="fade-in">
                  <div className="card section-gap">
                    <div className="section-title">Output Quality Rubric</div>
                    <div className="eval-grid">
                      {Object.entries(r.rubric_scores).map(([k,v])=>(
                        <div key={k} className="eval-cell">
                          <div className="eval-label">{k}</div>
                          <div className="eval-val" style={{color:scoreColor(v*100)}}>{Math.round(v*100)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {r.hallucination_flags.length===0
                    ? <div className="clean-flag">✓ Hallucination checker passed — all outputs grounded in source documents</div>
                    : <div style={{background:"#fef6ec",border:"1px solid #e8c49a",borderRadius:"var(--radius-sm)",padding:14}}>
                        {r.hallucination_flags.map((f,i)=><div key={i} style={{fontSize:12,color:"var(--warning)"}}>⚠ {f}</div>)}
                      </div>
                  }
                  <div className="arch-box">
                    {[
                      ["Orchestration","LangGraph StateGraph (parallel nodes)"],
                      ["LLM","GPT-4o via structured function calling"],
                      ["Embeddings","text-embedding-3-small"],
                      ["Vector Store","ChromaDB (pluggable: FAISS / Pinecone)"],
                      ["RAG","Multi-namespace retriever + chunk fusion"],
                      ["Evaluation","Rule-based rubric + LLM judge (GPT-4o-mini)"],
                      ["Backend","FastAPI + SQLAlchemy + PostgreSQL"],
                      ["Schemas","Pydantic v2 per agent"],
                    ].map(([k,v])=><div key={k}><span className="arch-key">{k.padEnd(16)}</span>{v}</div>)}
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
