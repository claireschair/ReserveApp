import { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from "react-native";

import { useMatch } from "../../../hooks/useMatch";
import { database } from "../../../lib/appwrite";
import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";

const ITEMS_DATABASE_ID = "69276d130021687546df";
const MATCHES_COLLECTION_ID = "matches";
const DONATIONS_COLLECTION_ID = "donations";
const REQUESTS_COLLECTION_ID = "requests";

const zipCache = new Map();
const lastGeocodingCall = { timestamp: 0 };
const GEOCODING_DELAY_MS = 1000;

async function getZipFromLatLng(lat, lng) {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  
  if (zipCache.has(cacheKey)) {
    return zipCache.get(cacheKey);
  }

  const now = Date.now();
  const timeSinceLastCall = now - lastGeocodingCall.timestamp;
  if (timeSinceLastCall < GEOCODING_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, GEOCODING_DELAY_MS - timeSinceLastCall));
  }

  try {
    lastGeocodingCall.timestamp = Date.now();
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'SchoolSupplyMatchApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      zipCache.set(cacheKey, null);
      return null;
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      zipCache.set(cacheKey, null);
      return null;
    }
    
    const data = await response.json();
    const zipCode = data.address?.postcode || null;
    zipCache.set(cacheKey, zipCode);
    return zipCode;
  } catch (err) {
    zipCache.set(cacheKey, null);
    return null;
  }
}

const SORT_LABELS = {
  score: "Best Match",
  items: "Most Items",
  recent: "Most Recent",
};

const DonationList = () => {
  const {
    getDonationsWithMatches,
    approveDonation,
    denyDonation,
    completeMatch,
    deleteDonation,
  } = useMatch();

  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState("score");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const preprocessZipCodes = async (donations) => {
    for (const donation of donations) {
      if (!donation.zipCode && donation.lat != null && donation.lng != null) {
        donation.zipCode = await getZipFromLatLng(donation.lat, donation.lng);
      }
      for (const match of donation.matches || []) {
        const r = match.request;
        if (r && !r.zipCode && r.lat != null && r.lng != null) {
          r.zipCode = await getZipFromLatLng(r.lat, r.lng);
        }
      }
    }
    return donations;
  };

  const loadDonations = async () => {
    setLoading(true);
    try {
      const data = await getDonationsWithMatches();
      const processed = await preprocessZipCodes(data || []);
      setDonations(processed);
    } catch (err) {
      console.error("Error loading donations:", err);
      Alert.alert("Error", "Failed to load donations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();

    // Subscribe to ALL relevant collections for realtime updates
    const unsubscribeMatches = database.client.subscribe(
      `databases.${ITEMS_DATABASE_ID}.collections.${MATCHES_COLLECTION_ID}.documents`,
      (response) => {
        console.log("Match update detected in DonationList, reloading...");
        loadDonations();
      }
    );

    const unsubscribeDonations = database.client.subscribe(
      `databases.${ITEMS_DATABASE_ID}.collections.${DONATIONS_COLLECTION_ID}.documents`,
      (response) => {
        console.log("Donation update detected, reloading...");
        loadDonations();
      }
    );

    const unsubscribeRequests = database.client.subscribe(
      `databases.${ITEMS_DATABASE_ID}.collections.${REQUESTS_COLLECTION_ID}.documents`,
      (response) => {
        console.log("Request update detected in DonationList, reloading...");
        loadDonations();
      }
    );

    return () => {
      unsubscribeMatches();
      unsubscribeDonations();
      unsubscribeRequests();
    };
  }, []);

  const filterAndSortMatches = (donation) => {
    let matches = donation.matches || [];

    // Apply search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      matches = matches.filter((m) => {
        const requestItems = [...(m.request?.items || []), ...(m.request?.other || [])];
        return requestItems.some(item => item.toLowerCase().includes(search));
      });
    }

    // Apply score filter
    if (minScore > 0) {
      matches = matches.filter((m) => (m.score || 0) >= minScore);
    }

    // Sort
    matches.sort((a, b) => {
      if (sortMode === "score") return (b.score || 0) - (a.score || 0);
      if (sortMode === "items") return (b.items?.length || 0) - (a.items?.length || 0);
      if (sortMode === "recent") {
        const aTime = new Date(a.$createdAt || 0).getTime();
        const bTime = new Date(b.$createdAt || 0).getTime();
        return bTime - aTime;
      }
      return 0;
    });

    return matches;
  };

  const handleApprove = (matchId) => {
    setCurrentMatchId(matchId);
    setContactEmail("");
    setContactPhone("");
    setContactModalVisible(true);
  };

  const handleDeny = async (matchId) => {
    Alert.alert(
      "Deny this match?",
      "Are you sure you want to deny this request? The requestor will be able to select other donations.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deny",
          style: "destructive",
          onPress: async () => {
            try {
              await denyDonation(matchId);
              Alert.alert("Match denied", "Your donation is now available for other requests.");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", err.message || "Failed to deny match.");
            }
          },
        },
      ]
    );
  };

  const submitApproval = async () => {
    if (!contactPhone.trim()) {
      Alert.alert("Error", "Phone number is required.");
      return;
    }
    try {
      await approveDonation(currentMatchId, {
        email: contactEmail || null,
        phone: contactPhone,
      });
      Alert.alert(
        "Match approved!",
        "The requestor will provide their contact info next."
      );
      setContactModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err.message || "Failed to approve match.");
    }
  };

  const handleDismissMatch = async (matchId) => {
    Alert.alert(
      "Complete Match",
      "This will mark the donation and request as completed. Do this after successfully exchanging the items.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              await completeMatch(matchId);
              Alert.alert("Match Completed!", "Thank you for using our service!");
              loadDonations();
            } catch (err) {
              console.error("Error completing match:", err);
              Alert.alert("Error", "Failed to complete match.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteDonation = async (donationId) => {
    Alert.alert(
      "Delete Donation",
      "Are you sure you want to delete this donation? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDonation(donationId);
              Alert.alert("Donation deleted", "Your donation has been removed.");
              loadDonations();
            } catch (err) {
              console.error("Error deleting donation:", err);
              Alert.alert("Error", "Failed to delete donation.");
            }
          },
        },
      ]
    );
  };

  const clearFilters = () => {
    setSearchText("");
    setMinScore(0);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Spacer />
        <ThemedText>Loading donations...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Spacer height={70} />
      <View style={styles.headerCard}>
      <ThemedText title style={styles.heading}>
        My Donations
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        View your past and current donations!
      </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <ThemedText style={styles.filterButtonText}>
            {showFilters ? "Hide" : "Filter"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <ThemedText style={styles.filterLabel}>Min Score:</ThemedText>
            <TextInput
              style={styles.filterInput}
              value={minScore.toString()}
              onChangeText={(val) => {
                const num = parseInt(val, 10);
                setMinScore(isNaN(num) ? 0 : num);
              }}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <ThemedText style={styles.clearButtonText}>Clear Filters</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Sort Dropdown */}
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setDropdownOpen(!dropdownOpen)}
        >
          <ThemedText>Sort by: {SORT_LABELS[sortMode]} ▼</ThemedText>
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={styles.dropdownItem}
                onPress={() => {
                  setSortMode(key);
                  setDropdownOpen(false);
                }}
              >
                <ThemedText
                  style={sortMode === key && styles.dropdownActiveText}
                >
                  {label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Spacer height={10} />

      <ScrollView>
        {donations.length === 0 && (
          <ThemedText style={styles.noMatch}>
            No donations yet. Create a donation to help others!
          </ThemedText>
        )}

        {donations.map((donation) => {
          const filteredMatches = filterAndSortMatches(donation);

          const pendingMatches = filteredMatches.filter((m) => m.status === "pending");
          const approvedMatches = filteredMatches.filter((m) => m.status === "approved");

          return (
            <View key={donation.$id} style={styles.donationCard}>
              <View style={styles.donationHeader}>
                <View style={styles.donationHeaderText}>
                  <ThemedText style={styles.donationTitle}>
                    Donation Items:
                  </ThemedText>
                  <ThemedText>
                    {[...(donation.items || []), ...(donation.other || [])].join(", ")}
                  </ThemedText>
                  <ThemedText style={styles.subtle}>
                    Location: {
                      donation.zipCode ? `Zip ${donation.zipCode}` : 
                      (donation.lat != null && donation.lng != null) ? 
                        `Coordinates: ${donation.lat.toFixed(2)}, ${donation.lng.toFixed(2)}` : 
                        "Not provided"
                    }
                  </ThemedText>
                </View>

                {!pendingMatches.length && !approvedMatches.length && (
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteDonation(donation.$id)}
                  >
                    <ThemedText style={styles.deleteIconText}>×</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <Spacer height={10} />

              {/* Pending Matches */}
              {pendingMatches.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>
                    Pending Requests ({pendingMatches.length}):
                  </ThemedText>
                  {pendingMatches.map((match) => (
                    <View key={match.$id} style={styles.matchCard}>
                      <ThemedText style={styles.pendingTitle}>
                        New Match Request
                      </ThemedText>
                      <ThemedText style={styles.infoText}>
                        A requestor has selected your donation. Approve or deny this match.
                      </ThemedText>
                      <Spacer height={8} />
                      <ThemedText style={styles.subtle}>
                        Requested Items:{" "}
                        {match.request?.items?.join(", ") || "N/A"}
                      </ThemedText>
                      <ThemedText style={styles.subtle}>
                        Match Score: {match.score || 0}
                      </ThemedText>
                      <ThemedText style={styles.subtle}>
                        Request Zip: {match.request?.zipCode || "N/A"}
                      </ThemedText>

                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => handleApprove(match.$id)}
                        >
                          <ThemedText style={styles.buttonText}>Approve</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.denyButton]}
                          onPress={() => handleDeny(match.$id)}
                        >
                          <ThemedText style={styles.buttonText}>Deny</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Approved Matches */}
              {approvedMatches.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>
                    Approved Matches ({approvedMatches.length}):
                  </ThemedText>
                  {approvedMatches.map((match) => (
                    <View key={match.$id}>
                      {!match.requestorPhone ? (
                        <View style={styles.matchCard}>
                          <ThemedText style={styles.approvedTitle}>
                            Match Approved - Waiting for Requestor
                          </ThemedText>
                          <ThemedText style={styles.infoText}>
                            You've approved this match. Waiting for the requestor to provide their contact info.
                          </ThemedText>
                          <Spacer height={8} />
                          <ThemedText style={styles.subtle}>
                            Requested Items:{" "}
                            {match.request?.items?.join(", ") || "N/A"}
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={styles.contactCard}>
                          <View style={styles.contactHeader}>
                            <ThemedText style={styles.completeTitle}>
                              Match Complete!
                            </ThemedText>
                            <TouchableOpacity
                              style={styles.dismissButton}
                              onPress={() => handleDismissMatch(match.$id)}
                            >
                              <ThemedText style={styles.dismissButtonText}>✕</ThemedText>
                            </TouchableOpacity>
                          </View>
                          
                          <View style={styles.contactInfoBox}>
                            <ThemedText style={styles.sectionTitle}>
                              Requestor Contact Information:
                            </ThemedText>
                            <ThemedText style={styles.contactDetail}>
                              Email: {match.requestorEmail || "Not provided"}
                            </ThemedText>
                            <ThemedText style={styles.contactDetail}>
                              Phone: {match.requestorPhone || "Not provided"}
                            </ThemedText>
                          </View>

                          <Spacer height={8} />
                          
                          <View style={styles.matchDetailsBox}>
                            <ThemedText style={styles.matchDetailLabel}>
                              Matched Items:
                            </ThemedText>
                            <ThemedText style={styles.matchDetailText}>
                              {match.items?.join(", ") || "N/A"}
                            </ThemedText>
                          </View>
                          
                          <ThemedText style={styles.instructionText}>
                            Contact the requestor to arrange pickup/delivery. Tap the X to complete this match.
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}

              {/* No Matches */}
              {filteredMatches.length === 0 && (
                <ThemedText style={styles.noMatch}>
                  No match requests yet.
                </ThemedText>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Contact Modal */}
      <Modal
        visible={contactModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText title style={{ marginBottom: 10 }}>
              Approve Match
            </ThemedText>
            <ThemedText style={styles.modalHint}>
              Provide your contact info so the requestor can reach you. Phone number
              is required.
            </ThemedText>

            <TextInput
              style={[styles.input, { color: "#111" }]}
              placeholder="Email (optional)"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              placeholderTextColor="#666"
            />
            <TextInput
              style={[styles.input, { color: "#111" }]}
              placeholder="Phone (required)"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#666"
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.approveButton,
                  { flex: 1, marginRight: 5 },
                ]}
                onPress={submitApproval}
              >
                <ThemedText style={styles.buttonText}>
                  Submit
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    flex: 1,
                    marginLeft: 5,
                    backgroundColor: "#f0f0f0",
                    borderColor: "#ccc",
                  },
                ]}
                onPress={() => setContactModalVisible(false)}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
};

export default DonationList;

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    padding: 16,
    backgroundColor: "#dee6ff",
  },
  heading: { 
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5, 
    color: "white",
  },
  headerCard: {
    backgroundColor: "#699cea",
    paddingVertical: 22,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignSelf: "center",
    marginBottom: 25,

    shadowColor: "#4F7BFF",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#e2f0ff",
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: "#ddd",
    color: "#000",
  },
  filterButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  filterButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  filtersContainer: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    marginRight: 10,
    width: 80,
  },
  filterInput: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    color: "#000",
  },
  clearButton: {
    backgroundColor: "#FF6B6B",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  clearButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  dropdownWrapper: { alignItems: "center", marginBottom: 10, zIndex: 1000 },
  dropdownButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dropdownMenu: {
    marginTop: 5,
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    width: 200,
    position: "absolute",
    top: 40,
  },
  dropdownItem: { padding: 10, alignItems: "center" },
  dropdownActiveText: { fontWeight: "bold", color: "#007AFF" },
  donationCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 18,
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  donationTitle: { fontWeight: "bold", fontSize: 16 },
  donationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  donationHeaderText: {
    flex: 1,
  },
  deleteIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  deleteIconText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: -2,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  noMatch: { color: "#777", fontStyle: "italic", marginTop: 8 },
  matchCard: {
    backgroundColor: "#f8fbff",
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  pendingTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#FF9800",
  },
  approvedTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#4CAF50",
  },
  completeTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#2196F3",
  },
  contactCard: {
    backgroundColor: "#f0f7ff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#4A90E2",
  },
  contactHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  dismissButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  contactInfoBox: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactDetail: {
    fontSize: 15,
    color: "#333",
    marginTop: 6,
    fontWeight: "500",
  },
  matchDetailsBox: {
    backgroundColor: "#F5F5F5",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  matchDetailLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  matchDetailText: {
    fontSize: 14,
    color: "#333",
  },
  deleteDonationButton: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FF9800",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: "center",
  },
  deleteDonationText: {
    color: "#E65100",
    fontWeight: "600",
    fontSize: 14,
  },
  infoText: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
    fontStyle: "italic",
  },
  subtle: { fontSize: 12, color: "#666", marginTop: 2 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  denyButton: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { 
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "85%", 
  },
  modalHint: { fontSize: 14, color: "#666", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
});