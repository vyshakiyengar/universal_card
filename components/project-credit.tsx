import Link from "next/link";

export function ProjectCredit() {
  return (
    <footer className="project-credit">
      <nav aria-label="Site information"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
      Project by <a href="https://vyshak.me">Vyshak K Iyengar</a>
    </footer>
  );
}
