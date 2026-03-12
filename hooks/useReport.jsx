import { useContext } from "react";
import { ReportContext } from "../contexts/ReportContext";

export function useReport() {
  const context = useContext(ReportContext);

  if (!context) {
    throw new Error("useReport must be used within a ReportProvider");
  }
  return context;
}
