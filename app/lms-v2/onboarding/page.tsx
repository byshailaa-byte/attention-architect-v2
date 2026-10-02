import { getLmsUserContext } from "@/lib/lms/user-context";
import { archetypeContent } from "@/content";
import { fillTokens } from "@/lib/report/tokens";
import { buildPronounTokens } from "@/lib/report/pronouns";
import { CHILD_NAME_FALLBACK } from "@/lib/report/pronouns";
import { BAND_LABEL } from "@/lib/lms/modules";
import V2Onboarding from "@/components/lms-v2/V2Onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await getLmsUserContext();
  const archC = archetypeContent[ctx.archetype] ?? archetypeContent["The All-In Kid"];
  const childName = ctx.childName || CHILD_NAME_FALLBACK;

  // Recap = the exact field the free report shows under "This pattern has a name"
  // (ArchetypeContent.s2Anecdote / ProfileView `anecdote`), filled the same way.
  const recap = fillTokens(archC.s2Anecdote, { ...buildPronounTokens(ctx.childGender, childName), child_name: childName });

  return (
    <V2Onboarding
      childName={childName}
      archetypeName={archC.displayName}
      ageBandLabel={BAND_LABEL[ctx.ageBand]}
      recap={recap}
    />
  );
}
