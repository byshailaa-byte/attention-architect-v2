export type ResourceCategory =
  | "start-here"
  | "six-skills"
  | "evening-problems"
  | "your-pattern"
  | "difficult-questions"
  | "shareables";

export type ResourceArticle = {
  slug: string;
  title: string;
  summary: string;
  category: ResourceCategory;
  readMinutes: number;
  body: string;          // markdown — :::callout Title\ntext\n::: and :::warn Title\ntext\n::: supported
  updatedAt?: string;    // e.g. "September 2026"
  shareable?: boolean;
  pdfAsset?: string;
};
