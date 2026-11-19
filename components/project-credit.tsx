import Link from "next/link";
import { ShareHeyaButton } from "./share-heya-button";

export function ProjectCredit() {
  return (
    <footer className="project-credit">
      <ShareHeyaButton />
      <div className="project-meta">
        <p className="project-by">Project by <a className="project-signature" href="https://vyshak.me">Vyshak K Iyengar</a></p>
        <nav aria-label="Site information"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
      </div>
    </footer>
  );
}
