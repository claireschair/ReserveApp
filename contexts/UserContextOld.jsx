  /*
  import { createContext, useEffect, useState } from "react";
  import { account, database } from "../lib/appwrite";
  import { ID, Query } from "react-native-appwrite";

  export const UserContext = createContext();

  const ITEMS_DATABASE_ID = "69276d130021687546df";
  const DONATIONS_COLLECTION_ID = "donations";
  const REQUESTS_COLLECTION_ID = "requests";
  const MATCHES_COLLECTION_ID = "matches";

  const FEEDBACK_DB_ID = "6921e0910003970bf9bb";
  const FEEDBACK_COLLECTION_ID = "feedbackattributers";

  const CENTER_DB_ID = "69599747001044200bfd";
  const CENTER_COLLECTION_ID = "centers";

  export function UserProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);

    async function login(email, password) {
      try {
        await account.deleteSession("current");
      } catch {}
      await account.createEmailPasswordSession(email, password);
      await getInitialUserValue();
    }

    async function register(email, password, name, label) {
      const newUser = await account.create(ID.unique(), email, password, name);

      await database.createDocument(
        process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
        ID.unique(),
        {
          userID: newUser.$id,
          name,
          email,
          label,
        }
      );

      await login(email, password);
    }

    async function logout() {
      await account.deleteSession("current");
      setUser(null);
    }

    async function getInitialUserValue() {
      try {
        const authUser = await account.get();

        const profile = await database.listDocuments(
          process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
          [Query.equal("userID", authUser.$id)]
        );

        setUser({ ...authUser, ...(profile.documents[0] || {}) });
      } catch {
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    }

    async function saveDonation(items, other = [], locationData = {}) {
      if (!user) throw new Error("User not logged in");

      const { zipCode = null, lat = null, lng = null } = locationData;

      return await database.createDocument(
        ITEMS_DATABASE_ID,
        DONATIONS_COLLECTION_ID,
        ID.unique(),
        {
          userId: user.$id,
          items,
          other,
          zipCode,
          lat,
          lng,
          status: "active",
        }
      );
    }

    async function saveRequest(items, other = [], locationData = {}) {
      if (!user) throw new Error("User not logged in");

      const { zipCode = null, lat = null, lng = null } = locationData;

      return await database.createDocument(
        ITEMS_DATABASE_ID,
        REQUESTS_COLLECTION_ID,
        ID.unique(),
        {
          userId: user.$id,
          items,
          other,
          zipCode,
          lat,
          lng,
          status: "active",
        }
      );
    }

    async function getRequestsWithMatches() {
      if (!user) throw new Error("User not logged in");

      const requestRes = await database.listDocuments(
        ITEMS_DATABASE_ID,
        REQUESTS_COLLECTION_ID,
        [Query.equal("userId", user.$id), Query.equal("status", "active")]
      );

      const enriched = [];

      for (const request of requestRes.documents) {
        const matchRes = await database.listDocuments(
          ITEMS_DATABASE_ID,
          MATCHES_COLLECTION_ID,
          [
            Query.equal("requestId", request.$id),
            Query.orderDesc("score"),
            Query.limit(10),
          ]
        );

        const matches = [];

        for (const match of matchRes.documents) {
          let donation = null;
          try {
            donation = await database.getDocument(
              ITEMS_DATABASE_ID,
              DONATIONS_COLLECTION_ID,
              match.donationId
            );

            if (donation.status !== "active") continue;
          } catch {
            continue;
          }

          matches.push({
            ...match,
            donation,
            donorEmail: match.donorEmail || null,
            donorPhone: match.donorPhone || null,
            requestorEmail: match.requestorEmail || null,
            requestorPhone: match.requestorPhone || null,
          });
        }

        enriched.push({ ...request, matches });
      }

      return enriched;
    }

    async function getDonationsWithMatches() {
      if (!user) throw new Error("User not logged in");

      const donationRes = await database.listDocuments(
        ITEMS_DATABASE_ID,
        DONATIONS_COLLECTION_ID,
        [Query.equal("userId", user.$id), Query.equal("status", "active")]
      );

      const enriched = [];

      for (const donation of donationRes.documents) {
        const matchRes = await database.listDocuments(
          ITEMS_DATABASE_ID,
          MATCHES_COLLECTION_ID,
          [
            Query.equal("donationId", donation.$id),
            Query.orderDesc("score"),
            Query.limit(10),
          ]
        );

        const matches = [];

        for (const match of matchRes.documents) {
          let request = null;
          try {
            request = await database.getDocument(
              ITEMS_DATABASE_ID,
              REQUESTS_COLLECTION_ID,
              match.requestId
            );

            if (request.status !== "active") continue;
          } catch {
            continue;
          }

          matches.push({
            ...match,
            request,
            donorEmail: match.donorEmail || null,
            donorPhone: match.donorPhone || null,
            requestorEmail: match.requestorEmail || null,
            requestorPhone: match.requestorPhone || null,
          });
        }

        enriched.push({ ...donation, matches });
      }

      return enriched;
    }

    async function updateMatchStatus(matchId, status, contactInfo = null, isRequestor = false) {
      if (!user) throw new Error("User not logged in");

      const match = await database.getDocument(
        ITEMS_DATABASE_ID,
        MATCHES_COLLECTION_ID,
        matchId
      );

      if (match.status === "approved") {
        throw new Error("This match has already been approved.");
      }

      const updateData = { status };

      if (status === "approved" && contactInfo) {
        if (isRequestor) {
          updateData.requestorEmail = contactInfo.email || null;
          updateData.requestorPhone = contactInfo.phone;
        } else {
          updateData.donorEmail = contactInfo.email || null;
          updateData.donorPhone = contactInfo.phone;
        }

        if (match.donationId) {
          try {
            await database.updateDocument(
              ITEMS_DATABASE_ID,
              DONATIONS_COLLECTION_ID,
              match.donationId,
              { status: "matched" }
            );
          } catch {}
        }

        if (match.requestId) {
          try {
            await database.updateDocument(
              ITEMS_DATABASE_ID,
              REQUESTS_COLLECTION_ID,
              match.requestId,
              { status: "matched" }
            );
          } catch {}
        }

        const otherMatches = await database.listDocuments(
          ITEMS_DATABASE_ID,
          MATCHES_COLLECTION_ID,
          [
            Query.or([
              Query.equal("donationId", match.donationId),
              Query.equal("requestId", match.requestId),
            ]),
          ]
        );

        for (const m of otherMatches.documents) {
          if (m.$id !== matchId) {
            await database.deleteDocument(
              ITEMS_DATABASE_ID,
              MATCHES_COLLECTION_ID,
              m.$id
            );
          }
        }
      }

      return await database.updateDocument(
        ITEMS_DATABASE_ID,
        MATCHES_COLLECTION_ID,
        matchId,
        updateData
      );
    }

    async function selectMatch(matchId) {
      return await updateMatchStatus(matchId, "pending");
    }

    async function provideContactInfo(matchId, contactInfo) {
      return await updateMatchStatus(matchId, "approved", contactInfo, true);
    }

    async function saveDonationCenter(items = [], locationData = {}) {
      if (!user) throw new Error("User not logged in");

      const { name, lat = null, lng = null } = locationData;

      return await database.createDocument(
        CENTER_DB_ID,
        CENTER_COLLECTION_ID,
        ID.unique(),
        {
          name,
          lat,
          lng,
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
      } catch {
        return [];
      }
    }

    async function saveFeedback(rating, text) {
      if (!user) throw new Error("User not logged in");

      return await database.createDocument(
        FEEDBACK_DB_ID,
        FEEDBACK_COLLECTION_ID,
        ID.unique(),
        { userId: user.$id, rating, text }
      );
    }

    useEffect(() => {
      getInitialUserValue();
    }, []);

    return (
      <UserContext.Provider
        value={{
          user,
          authChecked,
          login,
          logout,
          register,
          saveDonation,
          saveRequest,
          getRequestsWithMatches,
          getDonationsWithMatches,
          updateMatchStatus,
          selectMatch,
          provideContactInfo,
          saveDonationCenter,
          getDonationCenters,
          saveFeedback,
        }}
      >
        {children}
      </UserContext.Provider>
    );
  }
  */