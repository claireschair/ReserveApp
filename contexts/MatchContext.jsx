import { createContext, useContext } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { UserContext } from "./UserContext";
import { getUserPushToken, sendPushNotification } from "../notificationService";

export const MatchContext = createContext();

const MATCH_TIMEOUT_HOURS = 48;
const EXPIRATION_DAYS = 30;
const MIN_MATCH_SCORE = 1;
const MAX_DISTANCE_KM = 50;
const ALLOW_SELF_MATCHING = false;

async function getZipCodeFromCoordinates(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SchoolSupplyApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    const zipCode = 
      data.address?.postcode || 
      data.address?.postal_code || 
      data.address?.zip_code;

    if (zipCode) {
      const cleanZip = zipCode.replace(/[^\d-]/g, '');
      const match = cleanZip.match(/^(\d{5})(-\d{4})?$/);
      
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting zip code from coordinates:', error);
    return null;
  }
}

async function getUserData(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

function normalizeItems(items = []) {
  return items.map((i) => String(i).trim().toLowerCase()).filter(Boolean);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateMatchScore(donation, request) {
  const donationItems = normalizeItems(donation.items);
  const requestItems = normalizeItems(request.items);
  const overlap = donationItems.filter((item) => requestItems.includes(item));

  if (overlap.length === 0) return null;

  let score = overlap.length;
  const completeness = overlap.length / requestItems.length;

  if (completeness === 1.0) score += 5;
  else if (completeness >= 0.75) score += 3;
  else if (completeness >= 0.5) score += 2;
  else if (completeness >= 0.25) score += 1;

  let quantitySufficient = true;
  if (donation.quantities && request.quantities) {
    for (const item of overlap) {
      const donationIdx = donation.items.findIndex(
        (i) => i.toLowerCase() === item.toLowerCase()
      );
      const requestIdx = request.items.findIndex(
        (i) => i.toLowerCase() === item.toLowerCase()
      );
      if (
        donationIdx !== -1 &&
        requestIdx !== -1 &&
        donation.quantities[donationIdx] < request.quantities[requestIdx]
      ) {
        quantitySufficient = false;
        break;
      }
    }
    if (quantitySufficient) score += 2;
  }

  if (donation.location?.zipCode && request.location?.zipCode) {
    const diff = Math.abs(donation.location.zipCode - request.location.zipCode);
    if (diff === 0) score += 3;
    else if (diff <= 5) score += 2;
    else if (diff <= 10) score += 1;
  }

  if (
    donation.location?.lat != null &&
    donation.location?.lng != null &&
    request.location?.lat != null &&
    request.location?.lng != null
  ) {
    const distance = haversineDistance(
      donation.location.lat,
      donation.location.lng,
      request.location.lat,
      request.location.lng
    );
    if (distance > MAX_DISTANCE_KM) return null;
    if (distance <= 5) score += 3;
    else if (distance <= 15) score += 2;
    else if (distance <= 30) score += 1;
  }

  return {
    score: Number(score.toFixed(2)),
    overlap,
    completeness,
    quantitySufficient,
  };
}

function isExpired(request) {
  if (!request.expiresAt) return false;
  return request.expiresAt.toDate() < new Date();
}

function hasTimedOut(request) {
  if (!request.match?.pendingSince || request.status !== "pending") return false;
  const timeoutMs = MATCH_TIMEOUT_HOURS * 60 * 60 * 1000;
  return new Date() - request.match.pendingSince.toDate() > timeoutMs;
}

export function MatchProvider({ children }) {
  const { user } = useContext(UserContext);
  const userId = user?.uid ?? null;

  async function saveRequest(type, items, locationData = {}, quantitiesObject = {}) {
    if (!userId) return null;

    const quantities = items.map((item) => quantitiesObject[item] || 1);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

    let finalLocation = {
      zipCode: locationData.zipCode || null,
      lat: locationData.lat || null,
      lng: locationData.lng || null,
    };

    if (locationData.lat && locationData.lng && !locationData.zipCode) {
      try {
        const zipCode = await getZipCodeFromCoordinates(locationData.lat, locationData.lng);
        if (zipCode) {
          finalLocation.zipCode = zipCode;
        }
      } catch (error) {
        console.error('Failed to get zip code from coordinates:', error);
      }
    }

    const newRequest = await addDoc(collection(db, "requests"), {
      userId,
      type,
      items,
      quantities,
      location: finalLocation,
      status: "active",
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      match: {
        partnerId: null,
        partnerUserId: null,
        pendingSince: null,
        myContact: null,
        partnerContact: null,
      },
    });

    try {
      const oppositeType = type === "donate" ? "receive" : "donate";
      const q = query(
        collection(db, "requests"),
        where("type", "==", oppositeType),
        where("status", "==", "active")
      );

      const snapshot = await getDocs(q);
      const notifiedUsers = new Set();

      for (const docSnap of snapshot.docs) {
        const otherRequest = { id: docSnap.id, ...docSnap.data() };

        if (otherRequest.userId === userId && !ALLOW_SELF_MATCHING) continue;
        if (isExpired(otherRequest)) continue;

        const donationDoc =
          type === "donate"
            ? { items, quantities, location: finalLocation }
            : otherRequest;
        const requestDoc =
          type === "receive"
            ? { items, quantities, location: finalLocation }
            : otherRequest;

        const matchResult = calculateMatchScore(donationDoc, requestDoc);

        if (matchResult && matchResult.score >= MIN_MATCH_SCORE) {
          if (!notifiedUsers.has(otherRequest.userId)) {
            const pushToken = await getUserPushToken(otherRequest.userId);

            if (pushToken) {
              await sendPushNotification(
                pushToken,
                "New Match Found!",
                `A new ${type} matching your ${oppositeType} is available!`,
                {
                  type: "new_potential_match",
                  screen: type === "donate" ? "RequestList" : "DonationList",
                }
              );
              notifiedUsers.add(otherRequest.userId);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error sending match notifications:", err);
    }

    return { id: newRequest.id };
  }

  async function saveDonation(items, other, locationData, quantitiesObject) {
    const allItems = [...items, ...(other || [])];
    return saveRequest("donate", allItems, locationData, quantitiesObject);
  }

  async function saveReceiveRequest(items, other, locationData, quantitiesObject) {
    const allItems = [...items, ...(other || [])];
    return saveRequest("receive", allItems, locationData, quantitiesObject);
  }

  async function cleanupExpiredAndTimedOut() {
    try {
      const q = query(collection(db, "requests"));
      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        const req = { id: docSnap.id, ...docSnap.data() };

        if (isExpired(req) && (req.status === "active" || req.status === "pending")) {
          await updateDoc(doc(db, "requests", docSnap.id), { status: "expired" });
        }

        if (hasTimedOut(req)) {
          const partnerId = req.match?.partnerId;

          try {
            const userPushToken = await getUserPushToken(req.userId);
            if (userPushToken) {
              await sendPushNotification(
                userPushToken,
                "Match Expired",
                "Your pending match has timed out.",
                { type: "match_timeout" }
              );
            }

            if (partnerId) {
              const partnerDoc = await getDoc(doc(db, "requests", partnerId));
              if (partnerDoc.exists()) {
                const partnerUserId = partnerDoc.data().userId;
                const partnerPushToken = await getUserPushToken(partnerUserId);
                if (partnerPushToken) {
                  await sendPushNotification(
                    partnerPushToken,
                    "Match Expired",
                    "A pending match has timed out.",
                    { type: "match_timeout" }
                  );
                }
              }
            }
          } catch (notifErr) {
            console.error("Error sending timeout notifications:", notifErr);
          }

          await updateDoc(doc(db, "requests", docSnap.id), {
            status: "active",
            "match.partnerId": null,
            "match.partnerUserId": null,
            "match.pendingSince": null,
            "match.myContact": null,
            "match.partnerContact": null,
            "match.score": null,
          });

          if (partnerId) {
            await updateDoc(doc(db, "requests", partnerId), {
              status: "active",
              "match.partnerId": null,
              "match.partnerUserId": null,
              "match.pendingSince": null,
              "match.myContact": null,
              "match.partnerContact": null,
              "match.score": null,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error in cleanup:", err);
    }
  }

  async function getRequestsWithMatches(type) {
    if (!userId) return [];

    try {
      await cleanupExpiredAndTimedOut();

      const q = query(
        collection(db, "requests"),
        where("userId", "==", userId),
        where("type", "==", type)
      );

      const snapshot = await getDocs(q);
      const userRequests = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (r) =>
            r.status === "active" ||
            r.status === "pending" ||
            r.status === "matched"
        );

      const oppositeType = type === "donate" ? "receive" : "donate";
      const oppQuery = query(
        collection(db, "requests"),
        where("type", "==", oppositeType),
        where("status", "==", "active")
      );

      const oppSnapshot = await getDocs(oppQuery);
      const oppositeRequests = oppSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const enriched = [];

      for (const request of userRequests) {
        if (isExpired(request)) continue;

        const matches = [];
        let hasPendingMatch = false;

        if (request.match?.partnerId) {
          const partnerDoc = await getDoc(
            doc(db, "requests", request.match.partnerId)
          );
          if (partnerDoc.exists()) {
            const partnerRequest = { id: partnerDoc.id, ...partnerDoc.data() };
            const partnerUserData = await getUserData(partnerRequest.userId);

            const partner = {
              ...partnerRequest,
              school: partnerUserData?.school || null,
              name: partnerUserData?.name || "Unknown",
            };

            const donationDoc = type === "donate" ? request : partner;
            const receiveDoc = type === "receive" ? request : partner;
            const matchResult = calculateMatchScore(donationDoc, receiveDoc);

            const partnerContact = partner.match?.myContact || request.match.partnerContact;

            matches.push({
              id: partner.id,
              partner,
              items: matchResult?.overlap || [],
              score: matchResult?.score || 0,
              completeness: matchResult?.completeness || 0,
              quantitySufficient: matchResult?.quantitySufficient || false,
              status: request.status,
              myContact: request.match.myContact,
              partnerContact: partnerContact,
            });

            if (request.status === "pending") {
              hasPendingMatch = true;
            }
          }
        }

        if (!hasPendingMatch) {
          for (const oppRequest of oppositeRequests) {
            if (!ALLOW_SELF_MATCHING && oppRequest.userId === userId) continue;
            if (isExpired(oppRequest)) continue;

            const donationDoc = type === "donate" ? request : oppRequest;
            const receiveDoc = type === "receive" ? request : oppRequest;
            const matchResult = calculateMatchScore(donationDoc, receiveDoc);

            if (matchResult && matchResult.score >= MIN_MATCH_SCORE) {
              const partnerUserData = await getUserData(oppRequest.userId);
              const enrichedOppRequest = {
                ...oppRequest,
                school: partnerUserData?.school || null,
                name: partnerUserData?.name || "Unknown",
              };

              matches.push({
                id: enrichedOppRequest.id,
                partner: enrichedOppRequest,
                items: matchResult.overlap,
                score: matchResult.score,
                completeness: matchResult.completeness,
                quantitySufficient: matchResult.quantitySufficient,
                status: null,
                myContact: null,
                partnerContact: null,
                _isTemporary: true,
              });
            }
          }
        }

        matches.sort((a, b) => (b.score || 0) - (a.score || 0));

        enriched.push({
          ...request,
          matches: matches.slice(0, 10),
          hasPendingMatch,
        });
      }

      return enriched;
    } catch (err) {
      console.error("Error in getRequestsWithMatches:", err);
      return [];
    }
  }

  async function getDonationsWithMatches() {
    return getRequestsWithMatches("donate");
  }

  async function getReceiveRequestsWithMatches() {
    return getRequestsWithMatches("receive");
  }

  async function createAndSelectMatch(myRequest, theirRequest) {
    if (!userId) return null;

    const theirDoc = await getDoc(doc(db, "requests", theirRequest.id));
    if (!theirDoc.exists() || theirDoc.data().status !== "active") {
      throw new Error(
        "This request was just matched by someone else. Please try a different match."
      );
    }

    const myDoc = await getDoc(doc(db, "requests", myRequest.id));
    if (myDoc.data().match?.partnerId) {
      throw new Error(
        "You already have a pending match. Cancel it first or wait for approval."
      );
    }

    const donationDoc = myRequest.type === "donate" ? myRequest : theirRequest;
    const receiveDoc = myRequest.type === "receive" ? myRequest : theirRequest;

    await updateDoc(doc(db, "requests", myRequest.id), {
      status: "pending",
      "match.partnerId": theirRequest.id,
      "match.partnerUserId": theirRequest.userId,
      "match.pendingSince": Timestamp.now(),
    });

    await updateDoc(doc(db, "requests", theirRequest.id), {
      status: "pending",
      "match.partnerId": myRequest.id,
      "match.partnerUserId": userId,
      "match.pendingSince": Timestamp.now(),
    });

    try {
      const pushToken = await getUserPushToken(theirRequest.userId);
      if (pushToken) {
        await sendPushNotification(
          pushToken,
          "New Match Request!",
          `Someone has selected your ${theirRequest.type}. Review and approve.`,
          { type: "new_match_request" }
        );
      }
    } catch (err) {
      console.error("Error sending notification:", err);
    }

    return { id: myRequest.id };
  }

  async function cancelPendingMatch(requestId) {
    if (!userId) return null;

    const requestDoc = await getDoc(doc(db, "requests", requestId));
    if (!requestDoc.exists()) throw new Error("Request not found.");

    const request = requestDoc.data();
    if (request.userId !== userId)
      throw new Error("You can only cancel your own matches.");
    if (request.status !== "pending")
      throw new Error("This match is not pending.");

    const partnerId = request.match?.partnerId;

    await updateDoc(doc(db, "requests", requestId), {
      status: "active",
      "match.partnerId": null,
      "match.partnerUserId": null,
      "match.pendingSince": null,
      "match.myContact": null,
      "match.partnerContact": null,
    });

    if (partnerId) {
      await updateDoc(doc(db, "requests", partnerId), {
        status: "active",
        "match.partnerId": null,
        "match.partnerUserId": null,
        "match.pendingSince": null,
        "match.myContact": null,
        "match.partnerContact": null,
      });

      try {
        const partnerDoc = await getDoc(doc(db, "requests", partnerId));
        if (partnerDoc.exists()) {
          const partnerUserId = partnerDoc.data().userId;
          const pushToken = await getUserPushToken(partnerUserId);
          if (pushToken) {
            await sendPushNotification(
              pushToken,
              "Match Cancelled",
              "The other user cancelled their match request.",
              { type: "match_cancelled" }
            );
          }
        }
      } catch (err) {
        console.error("Error sending cancellation notification:", err);
      }
    }

    return true;
  }

  async function approveMatch(requestId, contactInfo) {
    if (!userId) return null;

    const requestDoc = await getDoc(doc(db, "requests", requestId));
    if (!requestDoc.exists()) throw new Error("Request not found.");

    const request = requestDoc.data();
    if (request.userId !== userId)
      throw new Error("You can only approve your own requests.");
    if (request.status !== "pending")
      throw new Error("This match is not pending.");

    const partnerId = request.match?.partnerId;
    if (!partnerId) throw new Error("No partner found for this match.");
    
    await updateDoc(doc(db, "requests", requestId), {
      "match.myContact": {
        email: contactInfo.email,
      },
    });

    try {
      const partnerDoc = await getDoc(doc(db, "requests", partnerId));
      if (partnerDoc.exists()) {
        const partnerUserId = partnerDoc.data().userId;
        const pushToken = await getUserPushToken(partnerUserId);
        if (pushToken) {
          await sendPushNotification(
            pushToken,
            "Match Approved!",
            "Your match request was approved. Provide your contact info to complete.",
            { type: "match_approved" }
          );
        }
      }
    } catch (err) {
      console.error("Error sending approval notification:", err);
    }

    return true;
  }

  async function denyMatch(requestId) {
    if (!userId) return null;

    const requestDoc = await getDoc(doc(db, "requests", requestId));
    if (!requestDoc.exists()) throw new Error("Request not found.");

    const request = requestDoc.data();
    if (request.userId !== userId)
      throw new Error("You can only deny your own requests.");
    if (request.status !== "pending")
      throw new Error("This match is not pending.");

    const partnerId = request.match?.partnerId;

    await updateDoc(doc(db, "requests", requestId), {
      status: "active",
      "match.partnerId": null,
      "match.partnerUserId": null,
      "match.pendingSince": null,
      "match.myContact": null,
      "match.partnerContact": null,
    });

    if (partnerId) {
      await updateDoc(doc(db, "requests", partnerId), {
        status: "active",
        "match.partnerId": null,
        "match.partnerUserId": null,
        "match.pendingSince": null,
        "match.myContact": null,
        "match.partnerContact": null,
      });

      try {
        const partnerDoc = await getDoc(doc(db, "requests", partnerId));
        if (partnerDoc.exists()) {
          const partnerUserId = partnerDoc.data().userId;
          const pushToken = await getUserPushToken(partnerUserId);
          if (pushToken) {
            await sendPushNotification(
              pushToken,
              "Match Denied",
              "Your match request was declined. You can select a different match.",
              { type: "match_denied" }
            );
          }
        }
      } catch (err) {
        console.error("Error sending denial notification:", err);
      }
    }

    return true;
  }

  async function provideContact(requestId, contactInfo) {
    if (!userId) return null;

    const requestDoc = await getDoc(doc(db, "requests", requestId));
    if (!requestDoc.exists()) throw new Error("Request not found.");

    const request = requestDoc.data();
    if (request.userId !== userId)
      throw new Error("You can only update your own contact info.");

    const partnerId = request.match?.partnerId;
    if (!partnerId) throw new Error("No matched request found.");

    const partnerDoc = await getDoc(doc(db, "requests", partnerId));
    if (!partnerDoc.exists()) throw new Error("Matched request not found.");

    const partner = partnerDoc.data();
    
    if (!partner.match?.myContact) {
      throw new Error("The donor hasn't approved yet or hasn't provided contact info.");
    }
    
    await updateDoc(doc(db, "requests", requestId), {
      status: "matched",
      "match.myContact": {
        email: contactInfo.email,
      },
      "match.partnerContact": partner.match.myContact,
    });
    
    await updateDoc(doc(db, "requests", partnerId), {
      status: "matched",
      "match.partnerContact": {
        email: contactInfo.email,
      },
    });

    try {
      const pushToken = await getUserPushToken(partner.userId);
      if (pushToken) {
        await sendPushNotification(
          pushToken,
          "Match Complete!",
          "Contact info exchanged! You can now coordinate pickup.",
          { type: "contact_provided" }
        );
      }
    } catch (err) {
      console.error("Error sending notification:", err);
    }

    return true;
  }

  async function completeMatch(requestId) {
    if (!userId) return null;

    const requestDoc = await getDoc(doc(db, "requests", requestId));
    if (!requestDoc.exists()) throw new Error("Request not found.");

    const request = requestDoc.data();
    const partnerId = request.match?.partnerId;

    await updateDoc(doc(db, "requests", requestId), { status: "completed" });

    if (partnerId) {
      await updateDoc(doc(db, "requests", partnerId), { status: "completed" });
    }

    return true;
  }

  async function deleteRequest(requestId) {
    if (!userId) return null;

    const requestDoc = await getDoc(doc(db, "requests", requestId));
    if (!requestDoc.exists()) throw new Error("Request not found.");

    const request = requestDoc.data();
    if (request.userId !== userId)
      throw new Error("You can only delete your own requests.");

    const partnerId = request.match?.partnerId;

    if (partnerId) {
      await updateDoc(doc(db, "requests", partnerId), {
        status: "active",
        "match.partnerId": null,
        "match.partnerUserId": null,
        "match.pendingSince": null,
        "match.myContact": null,
        "match.partnerContact": null,
      });
    }

    await updateDoc(doc(db, "requests", requestId), { status: "deleted" });

    return true;
  }

  function subscribeToRequest(requestId, callback) {
    if (!requestId) return () => {};
    
    const unsubscribe = onSnapshot(
      doc(db, "requests", requestId),
      (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data() });
        }
      },
      (error) => {
        console.error("Error listening to request:", error);
      }
    );

    return unsubscribe;
  }

  async function getSupplyStats() {
    try {
      const requestsQuery = query(
        collection(db, "requests"),
        where("status", "==", "completed"),
        where("type", "==", "donate") 
      );
      
      const snapshot = await getDocs(requestsQuery);
      const completedDonations = snapshot.docs.map(doc => doc.data());
      
      let totalItemsDistributed = 0;
      
      completedDonations.forEach(donation => {
        if (donation.items && donation.quantities) {
          donation.items.forEach((item, index) => {
            const quantity = donation.quantities[index] || 1;
            totalItemsDistributed += quantity;
          });
        }
      });
      
      const activeQuery = query(
        collection(db, "requests"),
        where("status", "in", ["active", "pending", "matched"])
      );
      
      const activeSnapshot = await getDocs(activeQuery);
      const activeRequests = activeSnapshot.docs.map(doc => doc.data());
      
      const donations = activeRequests.filter(r => r.type === "donate");
      const receives = activeRequests.filter(r => r.type === "receive");
      
      const itemCounts = { donated: {}, requested: {} };
      
      donations.forEach(donation => {
        donation.items?.forEach((item, index) => {
          const normalizedItem = item.toLowerCase();
          const quantity = donation.quantities?.[index] || 1;
          itemCounts.donated[normalizedItem] = (itemCounts.donated[normalizedItem] || 0) + quantity;
        });
      });
      
      receives.forEach(receive => {
        receive.items?.forEach((item, index) => {
          const normalizedItem = item.toLowerCase();
          const quantity = receive.quantities?.[index] || 1;
          itemCounts.requested[normalizedItem] = (itemCounts.requested[normalizedItem] || 0) + quantity;
        });
      });
      
      const allItems = new Set([
        ...Object.keys(itemCounts.donated),
        ...Object.keys(itemCounts.requested)
      ]);
      
      const stats = Array.from(allItems).map(item => ({
        item,
        donated: itemCounts.donated[item] || 0,
        requested: itemCounts.requested[item] || 0,
        gap: (itemCounts.requested[item] || 0) - (itemCounts.donated[item] || 0)
      }));
      
      return {
        totalDonations: donations.length,
        totalRequests: receives.length,
        totalItemsDistributed,
        itemStats: stats,
        topNeeded: stats
          .filter(s => s.gap > 0)
          .sort((a, b) => b.gap - a.gap)
          .slice(0, 10),
        topSurplus: stats
          .filter(s => s.gap < 0)
          .sort((a, b) => a.gap - b.gap)
          .slice(0, 10)
      };
    } catch (error) {
      console.error("Error getting supply stats:", error);
      return {
        totalDonations: 0,
        totalRequests: 0,
        totalItemsDistributed: 0,
        itemStats: [],
        topNeeded: [],
        topSurplus: []
      };
    }
  }

  return (
    <MatchContext.Provider
      value={{
        saveDonation,
        saveRequest: saveReceiveRequest,
        getRequestsWithMatches: getReceiveRequestsWithMatches,
        getDonationsWithMatches,
        createAndSelectMatch,
        cancelPendingMatch,
        approveDonation: approveMatch,
        denyDonation: denyMatch,
        provideRequestorContact: provideContact,
        cleanupExpiredAndTimedOut,
        completeMatch,
        deleteDonation: deleteRequest,
        deleteRequest,
        subscribeToRequest,
        getSupplyStats,
      }}
    >
      {children}
    </MatchContext.Provider>
  );
}

export function getLocationDisplay(locationData) {
  if (!locationData) {
    return "Not provided";
  }

  if (locationData.zipCode) {
    return `Zip ${locationData.zipCode}`;
  }

  if (locationData.lat && locationData.lng) {
    return `Location provided`;
  }

  return "Not provided";
}