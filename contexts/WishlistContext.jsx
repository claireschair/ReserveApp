import { createContext, useContext, useState, useEffect } from "react";
import { doc, collection, addDoc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserContext } from "./UserContext";

export const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const { user } = useContext(UserContext);
  const [existingWishlist, setExistingWishlist] = useState(null);
  const [wishlistDocId, setWishlistDocId] = useState(null);

  // Load wishlist on mount or when user changes
  useEffect(() => {
    if (user?.uid) loadWishlist();
  }, [user?.uid]);

  async function loadWishlist() {
    try {
      const wishlistsRef = collection(db, "users", user.uid, "wishlists");
      const snapshot = await getDocs(wishlistsRef);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setExistingWishlist(docSnap.data());
        setWishlistDocId(docSnap.id);
      }
    } catch (err) {
      console.error("Error loading wishlist:", err);
    }
  }

  async function saveWishlist(name, amazonLink, items = []) {
    if (!user?.uid) throw new Error("User not logged in");

    const itemsArray = Array.isArray(items) ? items : [];
    const wishlistsRef = collection(db, "users", user.uid, "wishlists");

    const data = {
      userId: user.uid,
      name: name || user.name || "Anonymous Teacher",
      amazonLink,
      items: itemsArray,
      updatedAt: serverTimestamp(),
    };

    if (existingWishlist && wishlistDocId) {
      // Update existing
      const docRef = doc(db, "users", user.uid, "wishlists", wishlistDocId);
      await updateDoc(docRef, data);
    } else {
      // Create new
      const docRef = await addDoc(wishlistsRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
      setWishlistDocId(docRef.id);
    }

    setExistingWishlist(data);
    return { id: wishlistDocId };
  }

  return (
    <WishlistContext.Provider value={{ saveWishlist, existingWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}