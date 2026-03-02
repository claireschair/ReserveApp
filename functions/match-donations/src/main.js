import { Client, Databases, ID, Query } from "node-appwrite";

export default async function (context) {
  context.log("Function started");

  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_API_KEY,
  } = process.env;

  const ITEMS_DATABASE_ID = "69276d130021687546df";
  const DONATION_COLLECTION_ID = "donations";
  const REQUEST_COLLECTION_ID = "requests";
  const MATCH_COLLECTION_ID = "matches";

  if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    context.error("Missing environment variables");
    return context.res.empty();
  }

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const donationsRes = await databases.listDocuments(
      ITEMS_DATABASE_ID,
      DONATION_COLLECTION_ID
    );

    const requestsRes = await databases.listDocuments(
      ITEMS_DATABASE_ID,
      REQUEST_COLLECTION_ID
    );

    const donations = donationsRes.documents;
    const requests = requestsRes.documents;

    for (const donation of donations) {
      const donationItems = normalizeItems(donation.items, donation.other);

      for (const request of requests) {
        const requestItems = normalizeItems(request.items, request.other);

        const overlap = donationItems.filter(item =>
          requestItems.includes(item)
        );
        if (overlap.length === 0) continue;

        let score = overlap.length;

        if (donation.zipCode && request.zipCode) {
          const diff = Math.abs(
            parseInt(donation.zipCode, 10) - parseInt(request.zipCode, 10)
          );
          if (diff === 0) score += 3;
          else if (diff <= 5) score += 2;
          else if (diff <= 10) score += 1;
        }

        if (
          donation.lat != null &&
          donation.lng != null &&
          request.lat != null &&
          request.lng != null
        ) {
          const distance = haversineDistance(
            donation.lat,
            donation.lng,
            request.lat,
            request.lng
          );

          if (distance <= 5) score += 3;
          else if (distance <= 15) score += 2;
          else if (distance <= 30) score += 1;
        }

        const existing = await databases.listDocuments(
          ITEMS_DATABASE_ID,
          MATCH_COLLECTION_ID,
          [
            Query.equal("donationId", donation.$id),
            Query.equal("requestId", request.$id),
            Query.equal("status", "pending") 
          ]
        );

        if (existing.total > 0) continue;

        await databases.createDocument(
          ITEMS_DATABASE_ID,
          MATCH_COLLECTION_ID,
          ID.unique(),
          {
            donationId: donation.$id,
            requestId: request.$id,
            items: overlap,
            score: Number(score.toFixed(2)),
            status: "pending",
          }
        );
      }
    }
  } catch (err) {
    context.error(err.message || err);
  }

  return context.res.empty();
}

function normalizeItems(items = [], other = []) {
  return [...items, ...other]
    .map(i => String(i).trim().toLowerCase())
    .filter(Boolean);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
