import type { ResourceArticle } from "./types";
import { article as whatAttentionIs } from "./what-attention-actually-is";

export const ARTICLES: ResourceArticle[] = [whatAttentionIs];

export function getArticle(slug: string): ResourceArticle | null {
  return ARTICLES.find(a => a.slug === slug) ?? null;
}

export function getArticlesByCategory(cat: string): ResourceArticle[] {
  return ARTICLES.filter(a => a.category === cat);
}
