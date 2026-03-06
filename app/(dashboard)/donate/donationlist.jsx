import { useEffect, useState, useContext } from "react";
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert, TextInput, Modal, RefreshControl } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useMatch } from "../../../hooks/useMatch";
import { UserContext } from "../../../contexts/UserContext";
import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";

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

  const { user } = useContext(UserContext);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState("score");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const loadDonations = async () => {
    try {
      const data = await getDonationsWithMatches();
      setDonations(data || []);
    } catch (err) {
      console.error("Error loading donations:", err);
      Alert.alert("Error", "Failed to load donations");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDonations();
    setRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    if (user?.uid) {
      loadDonations();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const myDonationsQuery = query(
      collection(db, "requests"),
      where("userId", "==", user.uid),
      where("type", "==", "donate")
    );

    const unsubscribeMyDonations = onSnapshot(
      myDonationsQuery,
      (snapshot) => {
        loadDonations();
      },
      (error) => {
        console.error("Error listening to my donations:", error);
      }
    );

    const receiveRequestsQuery = query(
      collection(db, "requests"),
      where("type", "==", "receive")
    );

    const unsubscribeReceiveRequests = onSnapshot(
      receiveRequestsQuery,
      (snapshot) => {
        loadDonations();
      },
      (error) => {
        console.error("Error listening to receive requests:", error);
      }
    );

    return () => {
      unsubscribeMyDonations();
      unsubscribeReceiveRequests();
    };
  }, [user?.uid]);

  const filterAndSortMatches = (donation) => {
    let matches = donation.matches || [];

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      matches = matches.filter((m) => {
        const requestItems = m.partner?.items || [];
        return requestItems.some(item => item.toLowerCase().includes(search));
      });
    }

    if (minScore > 0) {
      matches = matches.filter((m) => (m.score || 0) >= minScore);
    }

    matches.sort((a, b) => {
      if (sortMode === "score") return (b.score || 0) - (a.score || 0);
      if (sortMode === "items") return (b.items?.length || 0) - (a.items?.length || 0);
      return 0;
    });

    return matches;
  };

  const handleApprove = (requestId) => {
    setCurrentRequestId(requestId);
    setContactEmail("");
    setContactPhone("");
    setContactModalVisible(true);
  };

  const handleDeny = async (requestId) => {
    Alert.alert(
      "Deny this match?",
      "Are you sure? The requestor will be able to select other donations.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deny",
          style: "destructive",
          onPress: async () => {
            try {
              await denyDonation(requestId);
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
      await approveDonation(currentRequestId, {
        email: contactEmail || null,
        phone: contactPhone,
      });
      Alert.alert("Match approved!", "The requestor will provide their contact info next.");
      setContactModalVisible(false);
    } catch (err) {
      console.error("Error approving:", err);
      Alert.alert("Error", err.message || "Failed to approve match.");
    }
  };

  const handleDismissMatch = async (requestId) => {
    Alert.alert(
      "Complete Match",
      "Mark as completed after successfully exchanging items.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              await completeMatch(requestId);
              Alert.alert("Match Completed!", "Thank you!");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Failed to complete match.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteDonation = async (requestId) => {
    Alert.alert(
      "Delete Donation",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDonation(requestId);
              Alert.alert("Donation deleted");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Failed to delete.");
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
        <Spacer height={70} />
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
                <ThemedText style={sortMode === key && styles.dropdownActiveText}>
                  {label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Spacer height={10} />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {donations.length === 0 && (
          <ThemedText style={styles.noMatch}>
            No donations yet. Create one to help others!
          </ThemedText>
        )}

        {donations.map((donation) => {
          const filteredMatches = filterAndSortMatches(donation);
          
          const pendingRequests = filteredMatches.filter(
            (m) => m.status === "pending" && !m.myContact
          );
          const waitingForRequestor = filteredMatches.filter(
            (m) => m.status === "pending" && m.myContact && !m.partnerContact
          );
          const completedMatches = filteredMatches.filter(
            (m) => m.status === "matched" && m.partnerContact
          );

          const hasAnyMatch = pendingRequests.length > 0 || waitingForRequestor.length > 0 || completedMatches.length > 0;

          return (
            <View key={donation.id} style={styles.donationCard}>
              <View style={styles.donationHeader}>
                <View style={styles.donationHeaderText}>
                  <ThemedText style={styles.donationTitle}>Donation Items:</ThemedText>
                  <ThemedText>{(donation.items || []).join(", ")}</ThemedText>
                  <ThemedText style={styles.subtle}>
                    Location: {donation.location?.zipCode ? `Zip ${donation.location.zipCode}` : "Not provided"}
                  </ThemedText>
                </View>

                {!hasAnyMatch && (
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteDonation(donation.id)}
                  >
                    <ThemedText style={styles.deleteIconText}>×</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <Spacer height={10} />

              {pendingRequests.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>
                    Pending Requests ({pendingRequests.length}):
                  </ThemedText>
                  {pendingRequests.map((match) => (
                    <View key={match.id} style={styles.matchCard}>
                      <ThemedText style={styles.pendingTitle}>New Match Request</ThemedText>
                      <ThemedText style={styles.infoText}>
                        A requestor selected your donation. Approve or deny.
                      </ThemedText>
                      <Spacer height={8} />
                      <ThemedText style={styles.subtle}>
                        Requested Items: {match.partner?.items?.join(", ") || "N/A"}
                      </ThemedText>
                      <ThemedText style={styles.subtle}>Match Score: {match.score || 0}</ThemedText>

                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => handleApprove(donation.id)}
                        >
                          <ThemedText style={styles.buttonText}>Approve</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.denyButton]}
                          onPress={() => handleDeny(donation.id)}
                        >
                          <ThemedText style={styles.buttonText}>Deny</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {waitingForRequestor.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>
                    Waiting for Requestor ({waitingForRequestor.length}):
                  </ThemedText>
                  {waitingForRequestor.map((match) => (
                    <View key={match.id} style={styles.matchCard}>
                      <ThemedText style={styles.approvedTitle}>Match Approved - Waiting</ThemedText>
                      <ThemedText style={styles.infoText}>
                        Waiting for requestor to provide contact info.
                      </ThemedText>
                      <Spacer height={8} />
                      <ThemedText style={styles.subtle}>
                        Your contact: {match.myContact?.phone || "Not provided"}
                      </ThemedText>
                      <ThemedText style={styles.subtle}>
                        Requested Items: {match.partner?.items?.join(", ") || "N/A"}
                      </ThemedText>
                    </View>
                  ))}
                </>
              )}

              {completedMatches.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>
                    Completed Matches ({completedMatches.length}):
                  </ThemedText>
                  {completedMatches.map((match) => (
                    <View key={match.id} style={styles.contactCard}>
                      <View style={styles.contactHeader}>
                        <ThemedText style={styles.completeTitle}>Match Complete!</ThemedText>
                        <TouchableOpacity
                          style={styles.dismissButton}
                          onPress={() => handleDismissMatch(donation.id)}
                        >
                          <ThemedText style={styles.dismissButtonText}>✕</ThemedText>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.contactInfoBox}>
                        <ThemedText style={styles.sectionTitle}>Requestor Contact:</ThemedText>
                        <ThemedText style={styles.contactDetail}>
                          Email: {match.partnerContact?.email || "N/A"}
                        </ThemedText>
                        <ThemedText style={styles.contactDetail}>
                          Phone: {match.partnerContact?.phone || "Not provided"}
                        </ThemedText>
                      </View>

                      <Spacer height={8} />

                      <View style={styles.matchDetailsBox}>
                        <ThemedText style={styles.matchDetailLabel}>Matched Items:</ThemedText>
                        <ThemedText style={styles.matchDetailText}>
                          {match.items?.join(", ") || "N/A"}
                        </ThemedText>
                      </View>

                      <ThemedText style={styles.instructionText}>
                        Contact the requestor to arrange pickup/delivery. Tap X to complete.
                      </ThemedText>
                    </View>
                  ))}
                </>
              )}

              {filteredMatches.length === 0 && (
                <ThemedText style={styles.noMatch}>No match requests yet.</ThemedText>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={contactModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText title style={{ marginBottom: 10 }}>Approve Match</ThemedText>
            <ThemedText style={styles.modalHint}>
              Provide your contact info. Phone required.
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

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton, { flex: 1, marginRight: 5 }]}
                onPress={submitApproval}
              >
                <ThemedText style={styles.buttonText}>Submit</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { flex: 1, marginLeft: 5, backgroundColor: "#f0f0f0", borderColor: "#ccc" }]}
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
  clearButton: { backgroundColor: "#FF6B6B", padding: 8, borderRadius: 8, alignItems: "center" },
  clearButtonText: { color: "white", fontWeight: "bold" },
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
  donationHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  donationHeaderText: { flex: 1 },
  deleteIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIconText: { color: "white", fontSize: 24, fontWeight: "bold", marginTop: -2 },
  sectionTitle: { fontWeight: "bold", fontSize: 14, marginTop: 12, marginBottom: 8 },
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
  dismissButtonText: { color: "white", fontSize: 20, fontWeight: "bold" },
  contactInfoBox: { backgroundColor: "white", padding: 12, borderRadius: 8, marginBottom: 8 },
  contactDetail: { fontSize: 15, color: "#333", marginTop: 6, fontWeight: "500" },
  matchDetailsBox: { backgroundColor: "#F5F5F5", padding: 10, borderRadius: 8, marginBottom: 8 },
  matchDetailLabel: { fontSize: 13, fontWeight: "bold", color: "#666", marginBottom: 4 },
  matchDetailText: { fontSize: 14, color: "#333" },
  instructionText: { fontSize: 13, color: "#555", fontStyle: "italic", marginTop: 8 },
  infoText: { fontSize: 13, color: "#555", marginTop: 4, fontStyle: "italic" },
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
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: "#fff" },
});