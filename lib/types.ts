// Shape of data/interviews.json (produced by the extraction step).

export type IntervieweeType =
  | "student"
  | "parent"
  | "partner"
  | "agent"
  | "internal"
  | "non_user_student"
  | "synthesis";

export type InterviewStatus = "insights_posted" | "awaiting_insights" | "cancelled";

export interface Point {
  text: string;
  quote?: string | null;
  sourceTs?: string | null;
}

export interface Insight {
  id: string;
  text: string;
  theme: string;
  sourceTs?: string | null;
}

export interface Actionable {
  id: string;
  text: string;
  area: string;
  priority: "high" | "medium" | "low";
  rationale?: string;
  inferred?: boolean;
  /** Felix pod key (see data/routing.json) or "none" when no tech team owns it. */
  route?: string;
  sourceTs?: string | null;
}

export interface Gap {
  id: string;
  text: string;
  area?: string;
  sourceTs?: string | null;
}

export interface Interview {
  id: string;
  slackUrl: string;
  status: InterviewStatus;
  interviewee: {
    name: string;
    type: IntervieweeType;
    from?: string | null;
    destination?: string | null;
    university?: string | null;
    leadUrl?: string | null;
    bookedWithAmber?: boolean | null;
  };
  scheduledFor?: string | null;
  postedAt: string;
  postedBy: string;
  interviewers: string[];
  insightsPostedBy?: string[];
  insightsPostedAt?: string | null;
  meetLink?: string | null;
  recordingUrl?: string | null;
  summary: string;
  context: string[];
  sections: { title: string; points: Point[] }[];
  insights: Insight[];
  actionables: Actionable[];
  gaps: Gap[];
  openQuestions: string[];
  themes: string[];
}

/** The same ask raised in different interviews. */
export interface Cluster {
  id: string;
  title: string;
  actionableIds: string[];
}

export interface Dataset {
  generatedAt: string;
  clusters?: Cluster[];
  channel: { id: string; name: string };
  people: Record<string, { name: string }>;
  meta?: { ts: string; author: string; summary: string }[];
  interviews: Interview[];
}

// ---- Team state (statuses + comments), saved in Redis or the browser ----

export type ActionableStatus =
  | "open"
  | "is_expected"
  | "jira_created"
  | "low_priority"
  | "will_not_pick_up"
  | "mistakenly_assigned";

export interface HistoryEntry {
  at: string;
  by: string;
  status: ActionableStatus;
  note?: string;
}

export interface ActionableState {
  status: ActionableStatus;
  owner?: string; // pod key, set when someone reassigns it
  jiraUrl?: string;
  reason?: string;
  updatedBy: string;
  updatedAt: string;
  history: HistoryEntry[];
}

export interface Comment {
  id: string;
  interviewId: string;
  by: string;
  text: string;
  at: string;
}

export interface TeamState {
  mode: "shared" | "browser";
  actionables: Record<string, ActionableState>;
  comments: Record<string, Comment>;
}

export interface StatusChange {
  status: ActionableStatus;
  by: string;
  jiraUrl?: string;
  reason?: string;
  newOwner?: string;
}
