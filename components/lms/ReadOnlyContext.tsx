"use client";
// Read-only flag for LMS action components. Default false → normal customer behaviour.
// The admin "view as user" wrapper (AdminLmsView) provides `true`, which every mutating control
// reads via useReadOnly() to render itself disabled with the "Admin view — read only" tooltip and
// to short-circuit its fetch handler. Because the Provider is a client component wrapping the
// server-rendered LMS tree, nested client controls receive the value across RSC boundaries.
import { createContext, useContext } from "react";

export const ReadOnlyContext = createContext(false);
export const READ_ONLY_TOOLTIP = "Admin view — read only";
export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext);
}
