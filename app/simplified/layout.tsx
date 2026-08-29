import "./site.css";
import type { ReactNode } from "react";
import ExitIntentModal from "./ExitIntentModal";

export default function SimplifiedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ExitIntentModal />
    </>
  );
}
