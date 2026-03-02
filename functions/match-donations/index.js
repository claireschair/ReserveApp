const sdk = require('node-appwrite');

module.exports = async function (req, res) {
  const client = new sdk.Client();

  // Configure client with Appwrite environment variables
  client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID);

  const database = new sdk.Databases(client);

  // Environment variables for your collections
  const databaseId = process.env.DATABASE_ID;
  const donationCollectionId = process.env.DONATION_COLLECTION_ID;
  const receiveCollectionId = process.env.RECEIVE_COLLECTION_ID;
  const matchCollectionId = process.env.MATCH_COLLECTION_ID;

  try {
    const donationsResponse = await database.listDocuments(databaseId, donationCollectionId);
    const requestsResponse = await database.listDocuments(databaseId, receiveCollectionId);

    const donations = donationsResponse.documents;
    const requests = requestsResponse.documents;
    const matches = [];

    for (const donation of donations) {
      for (const request of requests) {
        const donationItems = donation.items || [];
        const requestItems = request.items || [];
        const overlap = donationItems.filter(item => requestItems.includes(item));

        if (overlap.length > 0) {
          const existingMatch = await database.listDocuments(
            databaseId,
            matchCollectionId,
            [
              sdk.Query.equal('donationId', donation.$id),
              sdk.Query.equal('requestId', request.$id)
            ]
          );

          if (existingMatch.total === 0) {
            const match = {
              donationId: donation.$id,
              requestId: request.$id,
              matchedItems: overlap,
              timestamp: new Date().toISOString()
            };

            await database.createDocument(databaseId, matchCollectionId, sdk.ID.unique(), match);
            matches.push(match);
          }
        }
      }
    }

    res.json({ success: true, matchesCreated: matches.length });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
};
