import { createContext, useContext } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserContext } from "./UserContext";

export const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const { user } = useContext(UserContext);

  async function saveWishlist(name, amazonLink, items = []) {
    if (!user?.uid) {
      throw new Error("User not logged in");
    }

    // Convert items to array if it's a string
    const itemsArray = typeof items === 'string' 
      ? items.split(',').map(item => item.trim()).filter(Boolean)
      : Array.isArray(items) 
        ? items 
        : [];

    try {
      const docRef = await addDoc(collection(db, 'teacher_wishlists'), {
        userId: user.uid,
        name: name || user.name || "Anonymous Teacher",
        amazonLink: amazonLink,
        items: itemsArray,
        createdAt: Timestamp.now(),
      });

      return { id: docRef.id };
    } catch (err) {
      console.error("Error saving wishlist:", err);
      throw err;
    }
  }

  return (
    <WishlistContext.Provider value={{ saveWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}