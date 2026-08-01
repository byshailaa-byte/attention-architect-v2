import { Suspense } from "react";
import LoginForm from "./LoginForm";

type Props = { searchParams: Promise<{ redirect?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectTo } = await searchParams;
  return (
    <Suspense fallback={null}>
      <LoginForm redirectTo={redirectTo ?? "/lms"} />
    </Suspense>
  );
}
