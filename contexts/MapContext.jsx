import { createContext, useContext } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp, GeoPoint } from "firebase/firestore";
import { UserContext } from "./UserContext";

export const MapContext = createContext();

export function MapProvider({ children }) {
  const { user } = useContext(UserContext);

  async function saveDonationCenter(items = [], locationData = {}) {
    if (!user) throw new Error("User not logged in");

    const { name, lat = null, lng = null } = locationData;

    if (!name || lat === null || lng === null) {
      throw new Error("Missing location data");
    }

    return await addDoc(collection(db, "centers"), {
      name,
      location: new GeoPoint(lat, lng),
      items,
      verified: false,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  }

  async function getDonationCenters() {
    try {
      const snapshot = await getDocs(collection(db, "centers"));
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert GeoPoint back to lat/lng for the map
          lat: data.location.latitude,
          lng: data.location.longitude,
        };
      });
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