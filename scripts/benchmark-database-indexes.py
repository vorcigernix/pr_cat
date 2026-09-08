"""Run with python3 scripts/benchmark-database-indexes.py; all data stays in memory."""

import datetime
import json
import pathlib
import sqlite3


root = pathlib.Path(__file__).resolve().parent.parent
db = sqlite3.connect(":memory:")
db.executescript((root / "lib/schema.sql").read_text())
db.executescript((root / "migrations/003_add_performance_indexes.sql").read_text())
db.executescript("""
    DROP INDEX idx_pull_requests_repo_created_at;
    DROP INDEX idx_pull_requests_repo_state_merged_at;
""")
db.executemany("INSERT INTO organizations(id, name) VALUES (?, ?)",
               [(i, f"org-{i}") for i in range(1, 11)])
db.executemany("INSERT INTO repositories(id, organization_id, name, full_name) VALUES (?, ?, ?, ?)",
               [(i, (i - 1) // 10 + 1, f"repo-{i}", f"org/repo-{i}") for i in range(1, 101)])
rows = []
start = datetime.date(2025, 9, 7)
for repo in range(1, 101):
    for number in range(1, 1001):
        created = start + datetime.timedelta(days=number % 365)
        timestamp = created.isoformat() + "T00:00:00Z"
        merged = (created + datetime.timedelta(days=1)).isoformat() + "T00:00:00Z" if number % 2 else None
        rows.append(((repo - 1) * 1000 + number, repo, number, "PR",
                     "merged" if number % 2 else "open", timestamp, timestamp, merged))
db.executemany("""INSERT INTO pull_requests
    (github_id, repository_id, number, title, state, created_at, updated_at, merged_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)""", rows)

queries = {
    "organization_created_range": (
        "SELECT COUNT(*) FROM pull_requests pr JOIN repositories r ON pr.repository_id=r.id "
        "WHERE r.organization_id=? AND pr.created_at>=?", (1, "2026-08-24T00:00:00Z")),
    "organization_date_wrapped_range": (
        "SELECT COUNT(*) FROM pull_requests pr JOIN repositories r ON pr.repository_id=r.id "
        "WHERE r.organization_id=? AND DATE(pr.created_at)>=DATE(?) AND DATE(pr.created_at)<=DATE(?)",
        (1, "2026-08-24", "2026-09-07")),
    "organization_merged_range": (
        "SELECT COUNT(*) FROM pull_requests pr JOIN repositories r ON pr.repository_id=r.id "
        "WHERE r.organization_id=? AND pr.state='merged' AND pr.merged_at>=?", (1, "2026-08-24T00:00:00Z")),
    "repository_recent_page": (
        "SELECT pr.* FROM pull_requests pr WHERE repository_id=? ORDER BY created_at DESC LIMIT 20", (1,)),
}

for phase in ("existing_indexes", "dashboard_indexes"):
    if phase == "dashboard_indexes":
        db.executescript((root / "migrations/005_add_dashboard_indexes.sql").read_text())
    db.execute("ANALYZE")
    for name, (sql, args) in queries.items():
        steps = [0]

        def progress():
            steps[0] += 100
            return 0

        plan = [row[3] for row in db.execute("EXPLAIN QUERY PLAN " + sql, args)]
        db.set_progress_handler(progress, 100)
        result = db.execute(sql, args).fetchall()
        db.set_progress_handler(None, 0)
        print(json.dumps({"phase": phase, "query": name, "plan": plan,
                          "vm_steps_approx": steps[0],
                          "result": len(result) if name == "repository_recent_page" else result[0][0]}))
db.close()
