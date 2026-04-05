import { createContext, useContext } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { UserContext } from "./UserContext";

export const ReviewContext = createContext();

export function ReviewProvider({ children }) {
  const { user } = useContext(UserContext);
  const userId = user?.uid ?? null;

  async function submitReview(revieweeId, matchId, rating, comment = "") {
    if (!userId) throw new Error("You must be logged in to submit a review.");
    if (!revieweeId) throw new Error("Reviewee ID is required.");
    if (!matchId) throw new Error("Match ID is required.");
    if (!rating || rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5.");
    if (userId === revieweeId) throw new Error("You cannot review yourself.");

    const matchDoc = await getDoc(doc(db, "requests", matchId));
    if (!matchDoc.exists()) throw new Error("Match not found.");
    if (matchDoc.data().status !== "completed") throw new Error("You can only review completed matches.");

    const existing = await getDocs(
      query(
        collection(db, "reviews"),
        where("reviewerId", "==", userId),
        where("matchId", "==", matchId)
      )
    );
    if (!existing.empty) throw new Error("You have already reviewed this match.");

    await runTransaction(db, async (transaction) => {
      const revieweeRef = doc(db, "users", revieweeId);
      const revieweeSnap = await transaction.get(revieweeRef);
      if (!revieweeSnap.exists()) throw new Error("Reviewee not found.");

      const revieweeData = revieweeSnap.data();
      const currentCount = revieweeData.ratingCount || 0;
      const currentAverage = revieweeData.ratingAverage || 0;
      const newCount = currentCount + 1;
      const newAverage = (currentAverage * currentCount + rating) / newCount;

      const reviewRef = doc(collection(db, "reviews"));
      transaction.set(reviewRef, {
        reviewerId: userId,
        revieweeId,
        matchId,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });

      transaction.update(revieweeRef, {
        ratingAverage: Math.round(newAverage * 10) / 10,
        ratingCount: newCount,
      });
    });

    return true;
  }

  async function hasReviewed(matchId) {
    if (!userId || !matchId) return false;
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "reviews"),
          where("reviewerId", "==", userId),
          where("matchId", "==", matchId)
        )
      );
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking review status:", error);
      return false;
    }
  }

  async function getReviewsForUser(targetUserId) {
    if (!targetUserId) return [];
    try {
      const snapshot = await getDocs(
        query(collection(db, "reviews"), where("revieweeId", "==", targetUserId))
      );
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Error fetching reviews:", error);
      return [];
    }
  }

  async function getUserRating(targetUserId) {
    if (!targetUserId) return { ratingAverage: 0, ratingCount: 0 };
    try {
      const userSnap = await getDoc(doc(db, "users", targetUserId));
      if (!userSnap.exists()) return { ratingAverage: 0, ratingCount: 0 };
      const data = userSnap.data();
      return {
        ratingAverage: data.ratingAverage || 0,
        ratingCount: data.ratingCount || 0,
      };
    } catch (error) {
      console.error("Error fetching user rating:", error);
      return { ratingAverage: 0, ratingCount: 0 };
    }
  }

  return (
    <ReviewContext.Provider
      value={{
        submitReview,
        hasReviewed,
        getReviewsForUser,
        getUserRating,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}