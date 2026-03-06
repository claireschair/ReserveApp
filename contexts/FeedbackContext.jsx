import { createContext, useContext } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { UserContext } from "./UserContext";

export const FeedbackContext = createContext();

export function FeedbackProvider({ children }) {
  const { user } = useContext(UserContext);

  async function saveFeedback(rating, text) {
    if (!user) throw new Error("User not logged in");

    return await addDoc(collection(db, "feedback"), {
      userId: user.uid,
      rating,
      text,
      createdAt: serverTimestamp(),
    });
  }

  return (
    <FeedbackContext.Provider value={{ saveFeedback }}>
      {children}
    </FeedbackContext.Provider>
  );
}
