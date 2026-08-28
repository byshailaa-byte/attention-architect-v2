import ArticlePage from "./ArticlePage";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ArticlePage slug={slug} />;
}
