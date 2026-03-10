import { createContext, useContext } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { UserContext } from "./UserContext";

export const ReportContext = createContext();

export function ReportProvider({ children }) {
  const { user } = useContext(UserContext);
  const userId = user?.uid ?? null;

  /**
   * Submit a report for a user
   * @param {string} reportedUserId - The user being reported
   * @param {string} reason - The reason category for the report
   * @param {string} description - Detailed description from the reporter
   * @param {object} context - Additional context (chatId, matchId, etc.)
   */
  async function submitReport(reportedUserId, reason, description, context = {}) {
    if (!userId) {
      throw new Error("You must be logged in to submit a report");
    }

    if (!reportedUserId) {
      throw new Error("Reported user ID is required");
    }

    if (!reason) {
      throw new Error("Please select a reason for the report");
    }

    try {
      const reportData = {
        reporterId: userId,
        reportedUserId,
        reason,
        description: description?.trim() || "",
        context: {
          chatId: context.chatId || null,
          matchId: context.matchId || null,
          ...context,
        },
        status: "pending", // pending, reviewing, resolved, dismissed
        createdAt: serverTimestamp(),
        resolvedAt: null,
        resolvedBy: null,
        moderatorNotes: null,
      };

      const reportRef = await addDoc(collection(db, "reports"), reportData);

      console.log("Report submitted:", reportRef.id);
      return { id: reportRef.id, ...reportData };
    } catch (error) {
      console.error("Error submitting report:", error);
      throw error;
    }
  }

  /**
   * Get all reports submitted by the current user
   */
  async function getMyReports() {
    if (!userId) return [];

    try {
      const q = query(
        collection(db, "reports"),
        where("reporterId", "==", userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error getting reports:", error);
      return [];
    }
  }

  /**
   * Check if user has already reported someone in a specific context
   */
  async function hasReported(reportedUserId, chatId = null) {
    if (!userId) return false;

    try {
      let q = query(
        collection(db, "reports"),
        where("reporterId", "==", userId),
        where("reportedUserId", "==", reportedUserId)
      );

      if (chatId) {
        q = query(q, where("context.chatId", "==", chatId));
      }

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking report status:", error);
      return false;
    }
  }

  return (
    <ReportContext.Provider
      value={{
        submitReport,
        getMyReports,
        hasReported,
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}