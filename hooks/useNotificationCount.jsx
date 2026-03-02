import { useState, useEffect, useContext } from 'react';
import { database } from '../lib/appwrite';
import { Query } from 'react-native-appwrite';
import { UserContext } from '../contexts/UserContext';

const MATCHES_DB_ID = "6946ce09003051fcb9a2";
const MATCHES_COLLECTION_ID = "matches";

export function useNotificationCount() {
  const [count, setCount] = useState(0);
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    loadNotificationCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(loadNotificationCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const loadNotificationCount = async () => {
    if (!user) return;

    try {
      // Count pending matches where user is donor (needs to approve/decline)
      const donorMatches = await database.listDocuments(
        MATCHES_DB_ID,
        MATCHES_COLLECTION_ID,
        [
          Query.equal("donorId", user.$id),
          Query.equal("status", "pending"),
        ]
      );

      // Count approved/rejected matches where user is requestor (updates to see)
      const requestorMatches = await database.listDocuments(
        MATCHES_DB_ID,
        MATCHES_COLLECTION_ID,
        [
          Query.equal("requestorId", user.$id),
          Query.or([
            Query.equal("status", "approved"),
            Query.equal("status", "rejected")
          ]),
        ]
      );

      const totalCount = donorMatches.total + requestorMatches.total;
      setCount(totalCount);
    } catch (err) {
      console.error("Error loading notification count:", err);
    }
  };

  return { count, refresh: loadNotificationCount };
}