"use client";

import { useState } from "react";
import WeekendCompleteButton from "@/components/lms/WeekendCompleteButton";
import Week6Survey from "@/components/lms/Week6Survey";

export default function Week6WeekendWrapper({
  alreadyComplete,
  surveyAlreadyDone,
  childName,
}: {
  alreadyComplete: boolean;
  surveyAlreadyDone: boolean;
  childName: string;
}) {
  const [showSurvey, setShowSurvey] = useState(alreadyComplete && !surveyAlreadyDone);
  const [surveyDone, setSurveyDone] = useState(surveyAlreadyDone);

  if (showSurvey && !surveyDone) {
    return <Week6Survey childName={childName} onDone={() => setSurveyDone(true)} />;
  }

  return (
    <WeekendCompleteButton
      week={6}
      alreadyComplete={alreadyComplete}
      nextWeek={null}
      nextWeekUnlocked={false}
      nextWeekUnlockHours={0}
      onCompleted={() => {
        if (!surveyAlreadyDone) setShowSurvey(true);
      }}
    />
  );
}
