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
  location: "Closest",
  completeness: "Most Complete",
};

const RequestList = () => {
  const {
    getRequestsWithMatches,
    createAndSelectMatch,
    cancelPendingMatch,
    provideRequestorContact,
    completeMatch,
    deleteRequest,
  } = useMatch();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState("score");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Search and filter states
  const [searchText, setSearchText] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [currentMatchId, setCurrentMatchId] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const preprocessZipCodes = async (requests) => {
    for (const req of requests) {
      if (!req.zipCode && req.lat != null && req.lng != null) {
        req.zipCode = await getZipFromLatLng(req.lat, req.lng);
      }
      for (const match of req.matches || []) {
        const d = match.donation;
        if (d && !d.zipCode && d.lat != null && d.lng != null) {
          d.zipCode = await getZipFromLatLng(d.lat, d.lng);
        }
      }
    }
    return requests;
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getRequestsWithMatches();
      const processed = await preprocessZipCodes(data || []);
      setRequests(processed);
    } catch (err) {
      console.error("Error loading requests:", err);
      Alert.alert("Error", "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    // Subscribe to ALL relevant collections for updates
    const unsubscribeMatches = database.client.subscribe(
      `databases.${ITEMS_DATABASE_ID}.collections.${MATCHES_COLLECTION_ID}.documents`,
      (response) => {
        console.log("Match update detected, reloading...");
        loadRequests();
      }
    );

    const unsubscribeDonations = database.client.subscribe(
      `databases.${ITEMS_DATABASE_ID}.collections.${DONATIONS_COLLECTION_ID}.documents`,
      (response) => {
        console.log("Donation update detected, reloading...");
        loadRequests();
      }
    );

    const unsubscribeRequests = database.client.subscribe(
      `databases.${ITEMS_DATABASE_ID}.collections.${REQUESTS_COLLECTION_ID}.documents`,
      (response) => {
        console.log("Request update detected, reloading...");
        loadRequests();
      }
    );

    return () => {
      unsubscribeMatches();
      unsubscribeDonations();
      unsubscribeRequests();
    };
  }, []);

  const filterAndSortMatches = (request) => {
    let matches = request.matches || [];

    // Apply search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      matches = matches.filter((m) => {
        const donationItems = [...(m.donation?.items || []), ...(m.donation?.other || [])];
        return donationItems.some(item => item.toLowerCase().includes(search));
      });
    }

    // Apply score filter
    if (minScore > 0) {
      matches = matches.filter((m) => (m.score || 0) >= minScore);
    }

    // Calculate zip diff for sorting
    matches = matches.map((m) => {
      let zipDiff = null;
      if (request.zipCode && m.donation?.zipCode) {
        zipDiff = Math.abs(
          Number(request.zipCode) - Number(m.donation.zipCode)
        );
      }
      return { ...m, zipDiff };
    });

    // Sort
    matches.sort((a, b) => {
      if (sortMode === "score") return (b.score || 0) - (a.score || 0);
      if (sortMode === "items") return (b.items?.length || 0) - (a.items?.length || 0);
      if (sortMode === "completeness") return (b.completeness || 0) - (a.completeness || 0);
      if (sortMode === "location") {
        const aHas = typeof a.zipDiff === "number";
        const bHas = typeof b.zipDiff === "number";
        if (aHas && bHas) return a.zipDiff - b.zipDiff;
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;
        return 0;
      }
      return 0;
    });

    return matches;
  };

  const handleSelectMatch = async (match, request) => {
    Alert.alert(
      "Select this match?",
      "Once selected, you'll wait for the donor to approve. You can only have one pending match at a time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Select",
          onPress: async () => {
            try {
              if (match._isTemporary) {
                await createAndSelectMatch(match.donation, request, {
                  overlap: match.items,
                  score: match.score,
                });
              }

              Alert.alert(
                "Match selected!",
                "Waiting for donor to approve or deny your request."
              );
            } catch (err) {
              console.error(err);
              Alert.alert("Error", err.message || "Failed to select match.");
            }
          },
        },
      ]
    );
  };

  const handleCancelPending = async (matchId) => {
    Alert.alert(
      "Cancel Pending Match?",
      "Are you sure you want to cancel this pending match? You'll be able to select a different match.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelPendingMatch(matchId);
              Alert.alert(
                "Match Cancelled",
                "You can now select a different match."
              );
            } catch (err) {
              console.error(err);
              Alert.alert("Error", err.message || "Failed to cancel match.");
            }
          },
        },
      ]
    );
  };

  const openContactModal = (matchId) => {
    setCurrentMatchId(matchId);
    setContactEmail("");
    setContactPhone("");
    setContactModalVisible(true);
  };

  const handleProvideContact = async () => {
    if (!contactPhone.trim()) {
      Alert.alert("Error", "Phone number is required.");
      return;
    }
    try {
      await provideRequestorContact(currentMatchId, {
        email: contactEmail || null,
        phone: contactPhone,
      });
      Alert.alert(
        "Success!",
        "Match complete! Your request and the donation have been matched. You can now coordinate with the donor."
      );
      setContactModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err.message || "Failed to save contact info.");
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
              loadRequests();
            } catch (err) {
              console.error("Error completing match:", err);
              Alert.alert("Error", "Failed to complete match.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteRequest = async (requestId) => {
    Alert.alert(
      "Delete Request",
      "Are you sure you want to delete this request? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRequest(requestId);
              Alert.alert("Request deleted", "Your request has been removed.");
              loadRequests();
            } catch (err) {
              console.error("Error deleting request:", err);
              Alert.alert("Error", "Failed to delete request.");
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
        <ThemedText>Loading matches...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Spacer height={70} />
      <View style={styles.headerCard}>
      <ThemedText title style={styles.heading}>
        Request Matches
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        See donors who match your requests!
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
        {requests.length === 0 && (
          <ThemedText style={styles.noMatch}>
            No requests yet. Create a request to get matches!
          </ThemedText>
        )}

        {requests.map((request) => {
          const filteredMatches = filterAndSortMatches(request);

          const pendingMatch = filteredMatches.find((m) => m.status === "pending");
          const approvedMatch = filteredMatches.find((m) => m.status === "approved");
          const availableMatches = filteredMatches.filter(
            (m) => !m.status || m._isTemporary
          );

          return (
            <View key={request.$id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestHeaderText}>
                  <ThemedText style={styles.requestTitle}>
                    Requested Items:
                  </ThemedText>
                  <ThemedText>
                    {[...(request.items || []), ...(request.other || [])].join(", ")}
                  </ThemedText>
                  <ThemedText style={styles.subtle}>
                    Location: {
                      request.zipCode ? `Zip ${request.zipCode}` : 
                      (request.lat != null && request.lng != null) ? 
                        `Coordinates: ${request.lat.toFixed(2)}, ${request.lng.toFixed(2)}` : 
                        "Not provided"
                    }
                  </ThemedText>
                </View>
                
                {!pendingMatch && !approvedMatch && (
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteRequest(request.$id)}
                  >
                    <ThemedText style={styles.deleteIconText}>×</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <Spacer height={10} />

              {approvedMatch && !approvedMatch.requestorPhone ? (
                <View style={styles.matchCard}>
                  <ThemedText style={styles.approvedTitle}>
                    Donor Approved Your Request!
                  </ThemedText>
                  <ThemedText style={styles.infoText}>
                    Please provide your contact information to complete the match.
                  </ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.selectButton,
                      { marginTop: 10, backgroundColor: "#4CAF50" },
                    ]}
                    onPress={() => openContactModal(approvedMatch.$id)}
                  >
                    <ThemedText style={{ color: "white", fontWeight: "bold" }}>
                      Provide Contact Info
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : approvedMatch && approvedMatch.requestorPhone ? (
                <View style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <ThemedText style={styles.completeTitle}>
                      Match Complete!
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={() => handleDismissMatch(approvedMatch.$id)}
                    >
                      <ThemedText style={styles.dismissButtonText}>✕</ThemedText>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.contactInfoBox}>
                    <ThemedText style={styles.sectionTitle}>
                      Donor Contact Information:
                    </ThemedText>
                    <ThemedText style={styles.contactDetail}>
                      Email: {approvedMatch.donorEmail || "Not provided"}
                    </ThemedText>
                    <ThemedText style={styles.contactDetail}>
                      Phone: {approvedMatch.donorPhone || "Not provided"}
                    </ThemedText>
                  </View>

                  <Spacer height={8} />
                  
                  <View style={styles.matchDetailsBox}>
                    <ThemedText style={styles.matchDetailLabel}>
                      Matched Items:
                    </ThemedText>
                    <ThemedText style={styles.matchDetailText}>
                      {approvedMatch.items?.join(", ") || "N/A"}
                    </ThemedText>
                  </View>
                  
                  <ThemedText style={styles.instructionText}>
                    Contact the donor to arrange pickup/delivery. Tap the X to complete this match.
                  </ThemedText>
                </View>
              ) : pendingMatch ? (
                <View style={styles.matchCard}>
                  <ThemedText style={styles.pendingTitle}>
                    Waiting for Donor Response
                  </ThemedText>
                  <ThemedText style={styles.infoText}>
                    You've selected a match. The donor will approve or deny your
                    request soon.
                  </ThemedText>
                  <Spacer height={8} />
                  <ThemedText style={styles.subtle}>
                    Donation Items:{" "}
                    {pendingMatch.donation?.items?.join(", ") || "N/A"}
                  </ThemedText>
                  <ThemedText style={styles.subtle}>
                    Match Score: {pendingMatch.score || 0}
                  </ThemedText>

                  <TouchableOpacity
                    style={[styles.selectButton, { 
                      marginTop: 10, 
                      backgroundColor: "#FF6B6B",
                      borderColor: "#FF6B6B" 
                    }]}
                    onPress={() => handleCancelPending(pendingMatch.$id)}
                  >
                    <ThemedText style={{ color: "white", fontWeight: "bold" }}>
                      Cancel Pending Match
                    </ThemedText>
                  </TouchableOpacity>
                  
                  <ThemedText style={styles.cancelHint}>
                    Taking too long? You can cancel and try a different match.
                  </ThemedText>
                </View>
              ) : availableMatches.length > 0 ? (
                <>
                  <ThemedText style={styles.instructionText}>
                    {availableMatches.length} potential{" "}
                    {availableMatches.length === 1 ? "match" : "matches"} found!
                    Select ONE to send a request to the donor.
                  </ThemedText>
                  {availableMatches.map((m, index) => (
                    <View key={m.$id} style={styles.matchCard}>
                      <ThemedText style={styles.matchTitle}>
                        Match #{index + 1}
                      </ThemedText>
                      <ThemedText>
                        Score: {m.score || 0} | Items: {m.items?.length || 0}
                        {m.completeness !== undefined && ` | ${(m.completeness * 100).toFixed(0)}% match`}
                      </ThemedText>
                      <ThemedText style={styles.itemsList}>
                        Available: {m.donation?.items?.join(", ") || "N/A"}
                      </ThemedText>
                      <ThemedText style={styles.subtle}>
                        Donation Zip:{" "}
                        {m.donation?.zipCode || "Location not provided"}
                      </ThemedText>
                      {m.quantitySufficient === false && (
                        <ThemedText style={styles.warningText}>
                          Note: May not have full quantity needed
                        </ThemedText>
                      )}

                      <TouchableOpacity
                        style={[styles.selectButton, { marginTop: 8 }]}
                        onPress={() => handleSelectMatch(m, request)}
                      >
                        <ThemedText>Select this match</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              ) : (
                <ThemedText style={styles.noMatch}>
                  No matches available yet. Check back soon!
                </ThemedText>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={contactModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText title style={{ marginBottom: 10 }}>
              Complete Your Match
            </ThemedText>
            <ThemedText style={styles.modalHint}>
              Provide your contact info so the donor can reach you. Phone number
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
                  styles.selectButton,
                  { flex: 1, marginRight: 5, backgroundColor: "#4CAF50" },
                ]}
                onPress={handleProvideContact}
              >
                <ThemedText style={{ color: "white", fontWeight: "bold" }}>
                  Submit
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.selectButton,
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

export default RequestList;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#dee6ff"},
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
    paddingHorizontal: 24,
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
    borderWidth: 1,
    borderColor: "#ddd",
    //width: '70%',
  },
  filterButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  filterButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  filtersContainer: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
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
    paddingHorizontal: 16,
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
  requestCard: {
    backgroundColor: "white",
  padding: 18,
  borderRadius: 18,
  marginBottom: 20,

  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
  },
  requestTitle: { fontWeight: "bold", fontSize: 16 },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  requestHeaderText: {
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
  instructionText: {
    fontSize: 13,
    color: "#555",
    fontStyle: "italic",
    marginBottom: 8,
    backgroundColor: "#E3F2FD",
    padding: 8,
    borderRadius: 6,
  },
  noMatch: { color: "#777", fontStyle: "italic", marginTop: 8 },
  matchCard: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  matchTitle: { fontWeight: "bold", fontSize: 15 },
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
    backgroundColor: "#E8F5E9",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#4CAF50",
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
  deleteRequestButton: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FF9800",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: "center",
  },
  deleteRequestText: {
    color: "#E65100",
    fontWeight: "600",
    fontSize: 14,
  },
  pendingTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#FF9800",
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
    fontStyle: "italic",
  },
  cancelHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    textAlign: "center",
    fontStyle: "italic",
  },
  warningText: {
    fontSize: 12,
    color: "#FF9800",
    marginTop: 4,
    fontStyle: "italic",
  },
  itemsList: { fontSize: 14, marginTop: 4, color: "#333" },
  subtle: { fontSize: 12, color: "#666", marginTop: 2 },
  selectButton: {
    marginTop: 5,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#E0F0FF",
    alignItems: "center",
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