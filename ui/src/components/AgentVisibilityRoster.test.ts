import { describe, expect, it } from "vitest";
import {
  filterIssuesByVisibilityFilter,
  getAgentTaskCounts,
  getBlockedIssues,
  getCompletionRate,
} from "./AgentVisibilityRoster";
import type { Issue } from "@paperclipai/shared";

function issue(overrides: Partial<Issue>): Issue {
  return {
    id: "i",
    status: "todo",
    title: "t",
    assigneeAgentId: null,
    updatedAt: new Date("2026-09-20T00:00:00Z"),
    ...overrides,
  } as unknown as Issue;
}

describe("getCompletionRate", () => {
  it("returns 0 with no issues", () => {
    expect(getCompletionRate([])).toEqual({ total: 0, done: 0, rate: 0 });
  });

  it("excludes cancelled issues from the total", () => {
    const rate = getCompletionRate([
      issue({ id: "a", status: "done" }),
      issue({ id: "b", status: "todo" }),
      issue({ id: "c", status: "cancelled" }),
    ]);
    expect(rate).toEqual({ total: 2, done: 1, rate: 50 });
  });
});

describe("getBlockedIssues", () => {
  it("returns only blocked issues, newest first", () => {
    const blocked = getBlockedIssues([
      issue({ id: "a", status: "blocked", updatedAt: new Date("2026-09-18T00:00:00Z") }),
      issue({ id: "b", status: "todo" }),
      issue({ id: "c", status: "blocked", updatedAt: new Date("2026-09-19T00:00:00Z") }),
    ]);
    expect(blocked.map((i) => i.id)).toEqual(["c", "a"]);
  });
});

describe("filterIssuesByVisibilityFilter", () => {
  const all = [
    issue({ id: "a", status: "todo" }),
    issue({ id: "b", status: "in_progress" }),
    issue({ id: "c", status: "blocked" }),
    issue({ id: "d", status: "done" }),
    issue({ id: "e", status: "in_review" }),
  ];

  it("passes everything through for all", () => {
    expect(filterIssuesByVisibilityFilter(all, "all")).toHaveLength(5);
  });

  it("filters each bucket", () => {
    expect(filterIssuesByVisibilityFilter(all, "blocked").map((i) => i.id)).toEqual(["c"]);
    expect(filterIssuesByVisibilityFilter(all, "done").map((i) => i.id)).toEqual(["d"]);
    expect(filterIssuesByVisibilityFilter(all, "in_progress").map((i) => i.id)).toEqual(["b"]);
    expect(filterIssuesByVisibilityFilter(all, "open").map((i) => i.id)).toEqual(["a", "e"]);
  });
});

describe("getAgentTaskCounts", () => {
  it("buckets per-agent counts and skips unassigned", () => {
    const counts = getAgentTaskCounts([
      issue({ id: "a", status: "todo", assigneeAgentId: "agent-1" }),
      issue({ id: "b", status: "blocked", assigneeAgentId: "agent-1" }),
      issue({ id: "c", status: "done", assigneeAgentId: "agent-1" }),
      issue({ id: "d", status: "cancelled", assigneeAgentId: "agent-1" }),
      issue({ id: "e", status: "todo", assigneeAgentId: null }),
    ]);
    expect(counts.get("agent-1")).toEqual({ open: 1, blocked: 1, done: 1 });
    expect(counts.has("")).toBe(false);
  });
});
