import { createContext, useContext } from "react";
import { database } from "../lib/appwrite";
import { ID } from "react-native-appwrite";
import { UserContext } from "./UserContext";

export const MapContext = createContext();

const CENTER_DB_ID = "69599747001044200bfd"; 
const CENTER_COLLECTION_ID = "centers";

export function MapProvider({ children }) {
  const { user } = useContext(UserContext);

  async function saveDonationCenter(items = [], locationData = {}) {
    if (!user) throw new Error("User not logged in");

    const {
      name,
      lat = null,
      lng = null,
    } = locationData;

    if (!name || lat === null || lng === null) {
      throw new Error("Missing location data");
    }

    return await database.createDocument(
      CENTER_DB_ID,
      CENTER_COLLECTION_ID,
      ID.unique(),
      {
        name,
        lat: lat,
        lng: lng,
        items,
        verified: false,
      }
    );
  }

  async function getDonationCenters() {
  try {
    const res = await database.listDocuments(
      CENTER_DB_ID,
      CENTER_COLLECTION_ID
    );
    return res.documents;
  } catch (err) {
    console.log("Failed to fetch donation centers", err);
    return [];
  }
}

  return (
    <MapContext.Provider value={{ saveDonationCenter, getDonationCenters }}>
      {children}
    </MapContext.Provider>
  );
}
