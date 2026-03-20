import { createContext, useContext } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, getDocs, serverTimestamp, GeoPoint, Timestamp } from "firebase/firestore";
import { UserContext } from "./UserContext";

export const MapContext = createContext();

export function MapProvider({ children }) {
  const { user } = useContext(UserContext);

  async function saveDonationCenter(items = [], locationData = {}) {
    if (!user) throw new Error("User not logged in");

    const { name, lat = null, lng = null, verified = false, startDate = null, endDate = null } = locationData;

    if (!name || lat === null || lng === null) {
      throw new Error("Missing location data");
    }

    // Prepare the document data
    const docData = {
      name,
      location: new GeoPoint(lat, lng),
      items,
      verified,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    };

    // Add dates if provided
    if (startDate) {
      docData.startDate = Timestamp.fromDate(new Date(startDate));
    }
    if (endDate) {
      docData.endDate = Timestamp.fromDate(new Date(endDate));
    }

    return await addDoc(collection(db, "centers"), docData);
  }

  async function getDonationCenters() {
    try {
      const snapshot = await getDocs(collection(db, "centers"));
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          $id: doc.id, // Using $id to match your existing code
          id: doc.id,
          ...data,
          // Convert GeoPoint back to lat/lng for the map
          lat: data.location.latitude,
          lng: data.location.longitude,
          // Convert Firestore Timestamps back to ISO strings
          startDate: data.startDate ? data.startDate.toDate().toISOString() : null,
          endDate: data.endDate ? data.endDate.toDate().toISOString() : null,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
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