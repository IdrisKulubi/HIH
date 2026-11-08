export const MENTOR_TOOLS = [
  {
    slug: "work-plan",
    label: "Work Plan",
    fileName: "BIRE-Mentor-Work-Plan.docx",
    url: "https://fsqo6oi7hg.ufs.sh/f/yuZU9AvSwYJhkFxyLioYQdHMaD2RcsylFZWOKtN531uEqvPz",
  },
  {
    slug: "activity-report",
    label: "Activity Report",
    fileName: "BIRE-Mentor-Activity-Report.docx",
    url: "https://fsqo6oi7hg.ufs.sh/f/yuZU9AvSwYJhR1HcnFtcwztT37PUKDGelJYkgn0OoNH8QuML",
  },
  {
    slug: "growth-strategy",
    label: "Growth Strategy",
    fileName: "BIRE-Mentor-Growth-Strategy.docx",
    url: "https://fsqo6oi7hg.ufs.sh/f/yuZU9AvSwYJhWcqUf79qDT94gnBSivArPpuJdzH23L856hNO",
  },
] as const;

export type MentorToolSlug = (typeof MENTOR_TOOLS)[number]["slug"];

const bySlug = new Map(MENTOR_TOOLS.map((tool) => [tool.slug, tool]));

export function getMentorTool(slug: string) {
  return bySlug.get(slug as MentorToolSlug);
}
