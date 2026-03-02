import { createContext, useContext } from "react";
import { database } from "../lib/appwrite";
import { ID } from "react-native-appwrite";
import { UserContext } from "./UserContext";

export const WishlistContext = createContext();

const WISHLIST_DB_ID = "6944caa80022e2cfa289";
const WISHLIST_COLLECTION_ID = "teacher_wishlists";

export function WishlistProvider({ children }) {
  const { user } = useContext(UserContext);
  const userId = user?.$id ?? null;

  async function saveWishlist(name, amazonLink, items = "") {
    if (!user) throw new Error("User not logged in");

    return await database.createDocument(
      WISHLIST_DB_ID,
      WISHLIST_COLLECTION_ID,
      ID.unique(),
      { 
        Name: name, 
        amazonLink,
        Items: items
      }
    );
  }

  return (
    <WishlistContext.Provider value={{ saveWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}