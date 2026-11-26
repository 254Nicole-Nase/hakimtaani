import { Link } from "@tanstack/react-router";

const links = [
  { to: "/case", label: "Build a case" },
  { to: "/chat", label: "Ask a question" },
  { to: "/analyze", label: "Check a contract" },
  { to: "/help", label: "Get help" },
] as const;

export function SiteHeader() {
  return (
    <header className="shrink-0 border-b bg-background">
      <a href="#main-content" className="sr-only z-50 focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:bg-card focus:p-3">Skip to content</a>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4 sm:px-6 lg:flex-nowrap">
        <Link to="/" aria-label="HakiMtaani home" className="flex items-center gap-2 py-3 text-primary">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M4 14 16 4l12 10v14H4V14Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M16 12v11m-7-8h14m-14 0-3 5h6l-3-5Zm14 0-3 5h6l-3-5ZM12 24h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-editorial text-2xl font-bold tracking-tight">HakiMtaani<span className="text-clay">.</span></span>
        </Link>
        <span className="hidden text-xs font-medium text-muted-foreground sm:block lg:order-last">Kenyan legal information</span>
        <nav aria-label="Main navigation" className="grid w-full grid-cols-2 gap-x-3 sm:flex sm:justify-between lg:w-auto lg:gap-6">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="flex min-h-11 items-center justify-center text-center border-b-2 border-transparent text-sm font-medium text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring" activeProps={{ className: "border-primary text-primary font-semibold", "aria-current": "page" }}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
