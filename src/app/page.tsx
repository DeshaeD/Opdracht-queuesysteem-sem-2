import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <h1>HBO ICT Virtual Queue</h1>
      <p>Choose your workspace.</p>
      <div className="row">
        <Link href="/teacher" className="button">
          Teacher dashboard
        </Link>
        <Link href="/student" className="button secondary">
          Student view
        </Link>
      </div>
      <p className="hint">
        Teacher API token defaults to <code>dev-teacher-token</code> outside production.
      </p>
    </main>
  );
}
