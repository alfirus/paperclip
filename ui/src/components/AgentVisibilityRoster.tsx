import { Link } from "@/lib/router";
import type { Agent, Issue } from "@paperclipai/shared";
import { cn } from "../lib/utils";
import { Card } from "@/components/ui/card";
import { Identity } from "./Identity";

export type VisibilityTaskFilter = "all" | "open" | "in_progress" | "blocked" | "done";

export interface AgentTaskCounts {
  open: number;
  blocked: number;
  done: number;
}

export function getAgentTaskCounts(issues: Issue[]): Map<string, AgentTaskCounts> {
  const map = new Map<string, AgentTaskCounts>();
  for (const issue of issues) {
    const agentId = issue.assigneeAgentId;
    if (!agentId) continue;
    const entry = map.get(agentId) ?? { open: 0, blocked: 0, done: 0 };
    if (issue.status === "done") entry.done += 1;
    else if (issue.status === "blocked") entry.blocked += 1;
    else if (issue.status !== "cancelled") entry.open += 1;
    map.set(agentId, entry);
  }
  return map;
}

export function getCompletionRate(issues: Issue[]): { total: number; done: number; rate: number } {
  const relevant = issues.filter((i) => i.status !== "cancelled");
  const done = relevant.filter((i) => i.status === "done").length;
  const total = relevant.length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, rate };
}

export function getBlockedIssues(issues: Issue[]): Issue[] {
  return issues
    .filter((i) => i.status === "blocked")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function filterIssuesByVisibilityFilter(issues: Issue[], filter: VisibilityTaskFilter): Issue[] {
  switch (filter) {
    case "all":
      return issues;
    case "open":
      return issues.filter((i) => i.status === "todo" || i.status === "backlog" || i.status === "in_review");
    case "in_progress":
      return issues.filter((i) => i.status === "in_progress");
    case "blocked":
      return issues.filter((i) => i.status === "blocked");
    case "done":
      return issues.filter((i) => i.status === "done");
  }
}

const statusBadgeClass: Record<string, string> = {
  running: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  idle: "bg-muted text-muted-foreground",
  paused: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  pending_approval: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  error: "bg-destructive/10 text-destructive",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface AgentVisibilityRosterProps {
  agents: Agent[];
  issues: Issue[];
}

export function AgentVisibilityRoster({ agents, issues }: AgentVisibilityRosterProps) {
  const counts = getAgentTaskCounts(issues);

  if (agents.length === 0) return null;

  return (
    <section aria-label="Agent roster" data-testid="agent-visibility-roster">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Agents ({agents.length})
        </h3>
        <Link to="/agents" className="text-sm text-muted-foreground underline underline-offset-2">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {agents.map((agent) => {
          const c = counts.get(agent.id) ?? { open: 0, blocked: 0, done: 0 };
          return (
            <Card
              key={agent.id}
              data-testid={`agent-visibility-card-${agent.id}`}
              className={cn("block p-4", agent.status === "error" && "border-destructive/50")}
            >
              <div className="flex items-start justify-between gap-2">
                <Identity name={agent.name} size="sm" className="min-w-0 flex-1" />
                <span
                  data-testid={`agent-visibility-status-${agent.id}`}
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    statusBadgeClass[agent.status] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {statusLabel(agent.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {c.open} open{c.blocked > 0 ? ` · ${c.blocked} blocked` : ""} · {c.done} done
              </p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
