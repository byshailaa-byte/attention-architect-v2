import { redirect } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import OnboardingFlow from "@/components/lms/OnboardingFlow";

export default async function OnboardingPage() {
  const ctx = await getLmsUserContext();

  // If already completed, go straight to journey map
  if (ctx.onboardingCompleted) redirect("/lms");

  return <OnboardingFlow childName={ctx.childName} />;
}
