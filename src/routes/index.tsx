import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronDown, Clock3, ExternalLink, FileCheck2, FilePlus2, FileText, History, LockKeyhole, Menu, RotateCcw, SearchCheck, ShieldAlert, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import referenceData from "@/data/reference-results.json";

type View = "upload" | "review" | "fixes" | "weaknesses" | "references" | "history";
type Report = typeof referenceData;
type SectionPoints = { section: string; points: string[] };
type HistoryEntry = { name: string; date: string; data: Report };

const views: { id: View; label: string; icon: typeof FileText; gated?: boolean }[] = [
  { id: "upload", label: "Upload New", icon: FilePlus2 },
  { id: "review", label: "Peer Review", icon: SearchCheck, gated: true },
  { id: "fixes", label: "Fixes", icon: FileCheck2, gated: true },
  { id: "weaknesses", label: "Weaknesses", icon: ShieldAlert, gated: true },
  { id: "references", label: "References", icon: BookOpen, gated: true },
  { id: "history", label: "History", icon: History },
];

export const Route = createFileRoute("/")({
  validateSearch: (search): { view: View } => ({
    view: views.some((item) => item.id === search["view"]) ? search["view"] as View : "upload",
  }),
  head: () => ({ meta: [
    { title: "Peer Review Workspace — Review" },
    { name: "description", content: "Upload a research paper and explore peer review scores, fixes, weaknesses, and references in one focused workspace." },
    { property: "og:title", content: "Peer Review Workspace — Review" },
    { property: "og:description", content: "A focused workspace for research paper scores, fixes, weaknesses, and references." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Workspace,
});

function Workspace() {
  const { view } = Route.useSearch();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [activeName, setActiveName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const currentView = view !== "history" && view !== "upload" && !report ? "upload" : view;
  const setView = (next: View) => { setMenuOpen(false); void navigate({ to: "/", search: { view: next } }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const acceptFile = (candidate?: File) => {
    if (!candidate) return;
    if (candidate.type !== "application/pdf" && !candidate.name.toLowerCase().endsWith(".pdf")) { setError("Please select a PDF document."); return; }
    if (candidate.size > 20 * 1024 * 1024) { setError("Please select a PDF smaller than 20 MB."); return; }
    setError(""); setFile(candidate);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); };
  const finishUpload = () => {
    if (!file) return;
    setReport(referenceData);
    setActiveName(file.name);
    setEntries((previous) => [{ name: file.name, date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), data: referenceData }, ...previous]);
    setView("review");
  };
  const importResults = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    try {
      const data: unknown = JSON.parse(await selected.text());
      if (!isReport(data)) throw new Error("Invalid report structure");
      setReport(data);
      setActiveName(file?.name || data.results.document_title);
      setEntries((previous) => [{ name: file?.name || data.results.document_title, date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), data }, ...previous]);
      setError(""); setView("review");
    } catch { setError("That results file could not be read. Please use a valid review results JSON file."); }
    event.target.value = "";
  };
  const restore = (entry: HistoryEntry) => { setReport(entry.data); setActiveName(entry.name); setView("review"); };
  const reset = () => { setFile(null); setReport(null); setActiveName(""); setView("upload"); };

  return <div className="min-h-screen bg-background text-foreground">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-card transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-20 items-center justify-between border-b border-border px-6">
        <div className="font-mono text-xs font-medium uppercase tracking-widest text-primary">Review <span className="text-muted-foreground">/ Workspace</span></div>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></Button>
      </div>
      <nav className="flex-1 space-y-1 p-4" aria-label="Workspace">
        {views.map((item, index) => <div key={item.id}>
          {(index === 1 || index === 5) && <div className="my-4 h-px bg-border" />}
          <Button variant={currentView === item.id ? "navActive" : "nav"} disabled={item.gated && !report} onClick={() => setView(item.id)} className="h-11 px-4 text-sm" title={item.gated && !report ? `Upload a document to open ${item.label}` : item.label} aria-current={currentView === item.id ? "page" : undefined}>
            <item.icon className="size-4" /><span className="flex-1 text-left">{item.label}</span>{item.gated && !report && <LockKeyhole className="size-3.5" />}
          </Button>
        </div>)}
      </nav>
      <div className="border-t border-border p-6"><div className="flex items-center gap-3"><div className="grid size-8 shrink-0 place-items-center rounded bg-secondary font-mono text-xs text-primary">R</div><div className="min-w-0"><div className="truncate text-xs font-semibold">Research workspace</div><div className="truncate text-[11px] text-muted-foreground">Peer review</div></div></div></div>
    </aside>
    {menuOpen && <div className="fixed inset-0 z-20 bg-foreground/30 lg:hidden" onClick={() => setMenuOpen(false)} />}
    <main className="min-h-screen lg:ml-64">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur-md sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></Button><span className="truncate font-mono text-[10px] uppercase text-muted-foreground">Workspace / {currentView === "upload" ? "New submission" : currentView === "history" ? "Archive" : activeName}</span></div>
        {report && currentView !== "upload" && <Button variant="report" size="sm" onClick={() => downloadReport(report, activeName)} title="Download review results"><ArrowDownToLine /> <span className="hidden sm:inline">Download results</span></Button>}
      </header>
      <div className="report-reveal mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14 lg:py-16" key={currentView + activeName}>
        {currentView === "upload" && <div className="space-y-12">
          <div><Eyebrow>NEW SUBMISSION</Eyebrow><h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-[42px]">Upload your research paper</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">Start with a PDF document. Your review sections will become available once your document is uploaded.</p></div>
          <div onDragEnter={(e) => { e.preventDefault(); setDragging(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={(e) => { e.preventDefault(); setDragging(false); }} onDrop={onDrop} className={`rounded-md border-2 border-dashed bg-card px-6 py-14 text-center transition-colors sm:py-20 ${dragging ? "border-primary bg-primary/5" : "border-input"}`}>
            <div className="mx-auto mb-6 grid size-14 place-items-center rounded-md bg-secondary text-primary"><UploadCloud className="size-6" /></div>
            <h2 className="font-display text-xl font-semibold">{file ? file.name : "Drop your manuscript here"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Ready to upload` : "PDF format · Up to 20 MB"}</p>
            <input ref={fileInput} type="file" accept=".pdf,application/pdf" className="sr-only" onChange={(e) => acceptFile(e.target.files?.[0])} aria-label="Choose PDF document" />
            <div className="mt-7 flex flex-wrap justify-center gap-3"><Button variant="report" onClick={() => fileInput.current?.click()}>{file ? "Choose another PDF" : "Select PDF"} <ArrowRight /></Button>{file && <Button variant="outline" onClick={finishUpload}>Continue to review <ArrowRight /></Button>}</div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="border-t border-border pt-6"><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">This workspace uses the supplied reference results for its review preview; uploading a PDF does not analyze its contents. If you have results for your document, import the matching JSON file below.</p><input ref={jsonInput} type="file" accept=".json,application/json" className="sr-only" onChange={importResults} aria-label="Import results JSON" /><Button variant="link" className="mt-2 px-0 text-primary" onClick={() => jsonInput.current?.click()}>Import results JSON <ArrowRight /></Button></div>
        </div>}
        {currentView === "history" && <div><PageHeading eyebrow="ARCHIVE" title="History" subtitle="Documents opened in this session." />{entries.length ? <div className="divide-y divide-border border-y border-border">{entries.map((entry, i) => <div key={`${entry.name}-${i}`} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="flex min-w-0 items-start gap-4"><FileText className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="break-words font-medium">{entry.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{entry.date}</p></div></div><Button variant="outline" size="sm" onClick={() => restore(entry)}>Open <ArrowRight /></Button></div>)}</div> : <div className="border-t border-border py-16 text-center"><Clock3 className="mx-auto mb-4 size-7 text-primary" /><h2 className="font-display text-xl font-semibold">No documents yet</h2><p className="mt-2 text-sm text-muted-foreground">Uploaded documents will appear here during this session.</p><Button variant="link" className="mt-4 text-primary" onClick={() => setView("upload")}>Upload a document <ArrowRight /></Button></div>}</div>}
        {report && currentView === "review" && <Review report={report} name={activeName} navigate={setView} />}
        {report && currentView === "fixes" && <Fixes report={report} />}
        {report && currentView === "weaknesses" && <Weaknesses report={report} />}
        {report && currentView === "references" && <References report={report} />}
        {report && currentView !== "history" && currentView !== "upload" && <div className="mt-16 border-t border-border pt-5"><Button variant="link" className="px-0 text-muted-foreground" onClick={reset}><RotateCcw /> Upload a new document</Button></div>}
      </div>
    </main>
  </div>;
}

function isReport(value: unknown): value is Report {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  const results = obj["results"] as Record<string, unknown> | undefined;
  return !!results && typeof results["document_title"] === "string" && typeof results["review"] === "string" && typeof results["score"] === "string" && Array.isArray(results["strength"]) && Array.isArray(results["weakness"]) && Array.isArray(results["grammatical_errors"]) && Array.isArray(obj["conference_results"]) && Array.isArray(obj["journal_results"]) && !!obj["references_data"] && !!obj["heatmap_results"];
}
function downloadReport(report: Report, name: string) { const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${name.replace(/\.pdf$/i, "") || "review"}-results.json`; a.click(); URL.revokeObjectURL(url); }
function Eyebrow({ children }: { children: ReactNode }) { return <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-primary">[ {children} ]</span>; }
function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) { return <div className="mb-10"><Eyebrow>{eyebrow}</Eyebrow><h1 className="mt-3 break-words font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>{subtitle && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}</div>; }
function SectionHeading({ title, count }: { title: string; count?: number }) { return <div className="mb-4 flex items-end justify-between gap-4 border-b-2 border-foreground pb-2"><h2 className="font-display text-sm font-bold uppercase">{title}</h2>{count !== undefined && <span className="shrink-0 font-mono text-[10px] text-muted-foreground">N={count.toString().padStart(2,"0")}</span>}</div>; }
function ScoreBar({ score }: { score: number }) { return <div className="h-1 w-20 overflow-hidden rounded-full bg-secondary sm:w-32"><div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, score * 10))}%` }} /></div>; }
function Points({ groups }: { groups: SectionPoints[] }) { return <div className="divide-y divide-border border-y border-border">{groups.map((group, i) => <details key={`${group.section}-${i}`} className="group py-5" open={i === 0}><summary className="flex cursor-pointer list-none items-center gap-4 [&::-webkit-details-marker]:hidden"><span className="font-mono text-xs text-primary">{String(i+1).padStart(2,"0")}</span><span className="min-w-0 flex-1 font-display text-base font-semibold">{group.section}</span><span className="font-mono text-xs text-muted-foreground">{group.points.length}</span><ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><ol className="ml-8 mt-5 space-y-4 border-l border-border pl-5">{group.points.map((point, j) => <li key={j} className="text-sm leading-relaxed text-foreground/75">{point}</li>)}</ol></details>)}</div>; }
function EmptyState({ children }: { children: ReactNode }) { return <div className="border-y border-border py-12 text-sm text-muted-foreground">{children}</div>; }

function Review({ report, name, navigate }: { report: Report; name: string; navigate: (view: View) => void }) {
  const result = report.results;
  const scores = result.score.split("\n").map((line) => { const match = line.match(/^(.*):\s*(\d+(?:\.\d+)?)\s*\/\s*10$/); return match ? { title: match[1], score: Number(match[2]) } : null; }).filter((x): x is { title: string; score: number } => x !== null);
  const average = scores.length ? (scores.reduce((sum, item) => sum + item.score, 0) / scores.length).toFixed(1) : "—";
  const heatmap = report.heatmap_results.paragraph_heatmap_scores;
  return <div className="space-y-14 sm:space-y-16">
    <section><Eyebrow>ANALYSIS REPORT</Eyebrow><h1 className="mt-3 break-words font-display text-3xl font-bold leading-tight sm:text-4xl">{result.document_title}</h1><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><FileText className="size-3.5" /> {name}</span><span>{result.document_category}</span></div><div className="mt-7 grid grid-cols-2 gap-5 border-y border-border py-6 sm:grid-cols-4"><Metric label="Average Score" value={average} suffix="/ 10" primary /><Metric label="Sections" value={String(scores.length).padStart(2,"0")} /><Metric label="Weaknesses" value={String(result.weakness.reduce((n,s) => n+s.points.length,0)).padStart(2,"0")} /><Metric label="References" value={String(report.references_data.years.length).padStart(2,"0")} /></div></section>
    <section className="grid gap-5 sm:grid-cols-12 sm:gap-8"><h2 className="font-mono text-xs uppercase tracking-widest text-primary sm:col-span-3">Summary</h2><div className="space-y-5 text-base leading-[1.85] text-foreground/80 sm:col-span-9 sm:text-lg">{result.review.split(/\n\s*\n/).map((part,i) => <p key={i}>{part}</p>)}</div></section>
    <section><SectionHeading title="Section evaluation" count={scores.length} /><div className="divide-y divide-border">{scores.map((item,i) => <div key={i} className="flex items-center justify-between gap-4 py-4"><span className="min-w-0 text-sm font-medium">{String(i+1).padStart(2,"0")}. {item.title}</span><div className="flex shrink-0 items-center gap-3"><ScoreBar score={item.score} /><span className="w-8 text-right font-mono text-xs">{item.score.toFixed(1)}</span></div></div>)}</div></section>
    <section><SectionHeading title="Structural heatmap" count={heatmap.length} /><p className="mb-5 text-sm text-muted-foreground">Paragraph scores by section. Hover or focus on a cell for its score.</p><div className="flex flex-wrap gap-1.5">{heatmap.map((item,i) => <div key={i} tabIndex={0} title={`${item.section} · Paragraph ${item.paragraph} · ${item.score}/10`} aria-label={`${item.section}, paragraph ${item.paragraph}, score ${item.score} out of 10`} className={`h-8 w-8 rounded-sm border border-primary/10 focus:outline-primary ${item.score >= 8 ? "bg-primary" : item.score >= 6 ? "bg-primary/60" : item.score >= 4 ? "bg-primary/35" : "bg-primary/15"}`} />)}</div><div className="mt-4 flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><span>LOW</span><span className="size-3 bg-primary/15" /><span className="size-3 bg-primary/35" /><span className="size-3 bg-primary/60" /><span className="size-3 bg-primary" /><span>HIGH</span></div></section>
    <section><SectionHeading title="Strengths" count={result.strength.length} /><Points groups={result.strength} /></section>
    <section className="rounded-md border border-border bg-card p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><h2 className="font-display text-lg font-bold">Continue the review</h2><p className="mt-2 text-sm text-muted-foreground">Explore the detailed findings by category.</p></div><Button variant="report" size="icon" aria-label="View fixes" onClick={() => navigate("fixes")}><ArrowRight /></Button></div><div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" onClick={() => navigate("fixes")}>Fixes <ArrowRight /></Button><Button variant="outline" onClick={() => navigate("weaknesses")}>Weaknesses <ArrowRight /></Button><Button variant="outline" onClick={() => navigate("references")}>References <ArrowRight /></Button></div></section>
  </div>;
}
function Metric({ label, value, suffix, primary }: { label: string; value: string; suffix?: string; primary?: boolean }) { return <div><div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div><div className={`mt-2 font-display text-2xl font-bold ${primary ? "text-primary" : "text-foreground"}`}>{value} {suffix && <span className="font-mono text-xs text-muted-foreground">{suffix}</span>}</div></div>; }
function Fixes({ report }: { report: Report }) { const grammar = report.results.grammatical_errors; const headings = report.results.headings_for_fixing.split("\n").filter(Boolean); return <div><PageHeading eyebrow="ACTION ITEMS" title="Fixes" subtitle="Corrections and sections flagged in the supplied review." /><div className="space-y-12"><section><SectionHeading title="Suggested corrections" count={grammar.reduce((n,s) => n+s.points.length,0)} />{grammar.length ? <Points groups={grammar} /> : <EmptyState>No grammatical corrections were included in this report.</EmptyState>}</section><section><SectionHeading title="Sections to revisit" count={headings.length} />{headings.length ? <div className="divide-y divide-border border-y border-border">{headings.map((heading,i) => <div key={i} className="flex gap-4 py-3.5 text-sm"><span className="font-mono text-xs text-primary">{String(i+1).padStart(2,"0")}</span>{heading}</div>)}</div> : <EmptyState>No headings were flagged.</EmptyState>}</section>{report.fix_results.length === 0 ? <p className="border-t border-border pt-5 text-sm text-muted-foreground">No additional fix results were supplied.</p> : <section><SectionHeading title="Additional fix results" count={report.fix_results.length} /><pre className="overflow-auto whitespace-pre-wrap break-words text-sm">{JSON.stringify(report.fix_results, null, 2)}</pre></section>}</div></div>; }
function Weaknesses({ report }: { report: Report }) { return <div><PageHeading eyebrow="REVIEW FINDINGS" title="Weaknesses" subtitle="Detailed concerns organized by manuscript section." /><SectionHeading title="Section findings" count={report.results.weakness.length} />{report.results.weakness.length ? <Points groups={report.results.weakness} /> : <EmptyState>No weaknesses were included in this report.</EmptyState>}</div>; }
function SafeLink({ href, children }: { href: string; children: ReactNode }) { return /^https:\/\//i.test(href) ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">{children}<ExternalLink className="size-3" /></a> : null; }
function References({ report }: { report: Report }) {
  const years = Object.entries(report.references_data.year_counts).sort(([a],[b]) => Number(a)-Number(b));
  const max = Math.max(1,...years.map(([,count]) => Number(count)));
  const firstYear = years.at(0)?.[0];
  const lastYear = years.at(-1)?.[0];
  const journals = report.journal_results.length ? report.journal_results : report.results.best_fit_journal;
  const conferences = report.conference_results.length ? report.conference_results : report.results.best_fit_conference;
  return <div><PageHeading eyebrow="CITATION LANDSCAPE" title="References" subtitle="Citation age, relevant scholars, and suggested publication venues from the supplied results." /><div className="space-y-14"><section><SectionHeading title="Citation years" count={report.references_data.years.length} /><div className="flex h-40 items-end gap-1 border-b border-border pt-4 sm:gap-2">{years.map(([year,count]) => <div key={year} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${year}: ${count} references`}><div className="w-full rounded-t-sm bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(5, Number(count) / max * 100)}%` }} /><span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[9px] text-muted-foreground sm:text-[10px]">{year.slice(-2)}</span></div>)}</div><p className="mt-9 text-xs text-muted-foreground">{years.length ? `${years[0][0]}–${years[years.length-1][0]} · ${report.references_data.years.length} dated references` : "No citation dates supplied"}</p></section><section><SectionHeading title="Relevant scholars" count={report.results.relevant_scholars.length} /><div className="divide-y divide-border">{report.results.relevant_scholars.map((scholar,i) => <div key={i} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:gap-6"><div><h3 className="font-display font-semibold">{scholar.scholar_name}</h3><p className="mt-1 text-xs text-muted-foreground">{scholar.affiliation} · {scholar.research_area}</p><p className="mt-2 text-sm leading-relaxed text-foreground/75">{scholar.relevance_reason}</p></div><div className="space-y-2 sm:text-right"><p className="font-mono text-[11px] text-muted-foreground">h-index {scholar.h_index} · {scholar.papers_count} papers · {scholar.citation_count} citations</p><SafeLink href={scholar.google_scholar_link}>Scholar profile</SafeLink></div></div>)}</div></section><section><SectionHeading title="Conferences" count={conferences.length} /><div className="divide-y divide-border">{conferences.map((venue,i) => <div key={i} className="py-5"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="max-w-xl font-display font-semibold">{venue.conference_name}</h3><span className="font-mono text-xs font-semibold text-primary">{venue.relevance_percentage} match</span></div><div className="mt-1 font-mono text-[11px] text-muted-foreground">{venue.organizer} · Ranking {venue.ranking} · Publication chance {venue.publication_chance}</div><p className="mt-3 text-sm leading-relaxed text-foreground/75">{venue.reason}</p><div className="mt-3"><SafeLink href={venue.submission_link}>Visit conference</SafeLink></div></div>)}</div></section><section><SectionHeading title="Journals" count={journals.length} /><div className="divide-y divide-border">{journals.map((venue,i) => <div key={i} className="py-5"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="max-w-xl font-display font-semibold">{venue.journal_name}</h3><span className="font-mono text-xs font-semibold text-primary">{venue.relevance_percentage} match</span></div><div className="mt-1 font-mono text-[11px] text-muted-foreground">{venue.publisher} · Impact factor {venue.impact_factor} · Publication chance {venue.publication_chance}</div><p className="mt-3 text-sm leading-relaxed text-foreground/75">{venue.reason}</p><div className="mt-3"><SafeLink href={venue.submission_link}>Visit journal</SafeLink></div></div>)}</div></section></div></div>;
}
