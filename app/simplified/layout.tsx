import "./site.css";
import type { ReactNode } from "react";
import ExitIntentModal from "./ExitIntentModal";
import UtmCapture from "./UtmCapture";

export default function SimplifiedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <UtmCapture />
      {children}
      <ExitIntentModal />
    </>
  );
}
