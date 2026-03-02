import { createContext, useContext } from "react";
import { database } from "../lib/appwrite";
import { ID } from "react-native-appwrite";
import { UserContext } from "./UserContext";

export const FeedbackContext = createContext();

const FEEDBACK_DB_ID = "6921e0910003970bf9bb";
const FEEDBACK_COLLECTION_ID = "feedbackattributers";

export function FeedbackProvider({ children }) {
  const { user } = useContext(UserContext);
  const userId = user?.$id ?? null;

  async function saveFeedback(rating, text) {
    if (!user) throw new Error("User not logged in");

    return await database.createDocument(
      FEEDBACK_DB_ID,
      FEEDBACK_COLLECTION_ID,
      ID.unique(),
      { userId: user.$id, rating, text }
    );
  }

  return (
    <FeedbackContext.Provider value={{ saveFeedback }}>
      {children}
    </FeedbackContext.Provider>
  );
}
