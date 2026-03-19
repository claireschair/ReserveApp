import { useEffect, useState, useContext } from "react";
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert, TextInput, Modal, RefreshControl, Keyboard } from "react-native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { router } from "expo-router";
import { db } from "../../../lib/firebase";
import { useMatch } from "../../../hooks/useMatch";
import { useChat } from "../../../hooks/useChat";
import { UserContext } from "../../../contexts/UserContext";
import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import { Ionicons } from "@expo/vector-icons";

function getLocationDisplay(locationData) {
  if (!locationData) return "Not provided";
  if (locationData.zipCode) return `Zip ${locationData.zipCode}`;
  if (locationData.lat && locationData.lng) return "Location provided";
  return "Not provided";
}

function getSchoolDisplay(userData) {
  if (!userData?.school) return "No school";
  return userData.school.schoolName || "Unknown school";
}

function buildSpecsMap(requestDoc) {
  const map = {};
  if (!requestDoc?.items || !requestDoc?.specs) return map;
  requestDoc.items.forEach((item, idx) => {
    const spec = requestDoc.specs[idx];
    if (spec) map[item.toLowerCase()] = spec;
  });
  return map;
}

function ItemsWithSpecs({ items = [], specsMap = {} }) {
  if (!items.length) return <ThemedText style={styles.subtle}>N/A</ThemedText>;
  return (
    <View style={styles.itemSpecList}>
      {items.map((item, idx) => {
        const spec = specsMap[item.toLowerCase()];
        return (
          <View key={idx} style={styles.itemSpecRow}>
            <ThemedText style={styles.itemSpecItemName}>
              {item}
              {!!spec && (
                <ThemedText style={styles.itemSpecDetail}> - {spec}</ThemedText>
              )}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
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

  const { getOrCreateChat, getChatByMatchId, closeChat } = useChat();
  const { user } = useContext(UserContext);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState("score");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState({});

  const loadRequests = async () => {
    try {
      const data = await getRequestsWithMatches();
      setRequests(data || []);
    } catch (err) {
      console.error("Error loading requests:", err);
      Alert.alert("Error", "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user?.uid) loadRequests();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const myRequestsQuery = query(
      collection(db, "requests"),
      where("userId", "==", user.uid),
      where("type", "==", "receive")
    );
    const unsubscribeMyRequests = onSnapshot(
      myRequestsQuery,
      () => { loadRequests(); },
      (error) => { console.error("Error listening to my requests:", error); }
    );

    const donationsQuery = query(
      collection(db, "requests"),
      where("type", "==", "donate")
    );
    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      () => { loadRequests(); },
      (error) => { console.error("Error listening to donations:", error); }
    );

    return () => {
      unsubscribeMyRequests();
      unsubscribeDonations();
    };
  }, [user?.uid]);

  const filterAndSortMatches = (request) => {
    let matches = request.matches || [];

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      matches = matches.filter((m) => {
        const donationItems = m.partner?.items || [];
        const partnerSchool = m.partner?.school?.schoolName?.toLowerCase() || "";
        return (
          donationItems.some(item => item.toLowerCase().includes(search)) ||
          partnerSchool.includes(search)
        );
      });
    }

    if (minScore > 0) {
      matches = matches.filter((m) => (m.score || 0) >= minScore);
    }

    matches = matches.map((m) => {
      let zipDiff = null;
      if (request.location?.zipCode && m.partner?.location?.zipCode) {
        zipDiff = Math.abs(request.location.zipCode - m.partner.location.zipCode);
      }
      return { ...m, zipDiff };
    });

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
                await createAndSelectMatch(request, match.partner);
              }
              Alert.alert("Match selected!", "Waiting for donor to approve or deny your request.");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", err.message || "Failed to select match.");
            }
          },
        },
      ]
    );
  };

  const handleCancelPending = async (requestId) => {
    Alert.alert(
      "Cancel Pending Match?",
      "Are you sure? You'll be able to select a different match.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelPendingMatch(requestId);
              Alert.alert("Match Cancelled", "You can now select a different match.");
            } catch (err) {
              console.error(err);
              Alert.alert("Error", err.message || "Failed to cancel match.");
            }
          },
        },
      ]
    );
  };

  const openContactModal = (requestId) => {
    setCurrentRequestId(requestId);
    setContactEmail("");
    setContactModalVisible(true);
  };

  const handleProvideContact = async () => {
    if (!contactEmail.trim()) {
      Alert.alert("Error", "Email address is required.");
      return;
    }
    if (!contactEmail.includes('@')) {
      Alert.alert("Error", "Please provide a valid email address.");
      return;
    }
    try {
      await provideRequestorContact(currentRequestId, { email: contactEmail });
      Alert.alert("Success!", "Match complete! You can now coordinate with the donor.");
      setContactModalVisible(false);
      setContactEmail("");
      setCurrentRequestId(null);
    } catch (err) {
      console.error("Error providing contact:", err);
      Alert.alert("Error", err.message || "Failed to save contact info.");
    }
  };

  const handleOpenChat = async (requestId, match) => {
    try {
      const chat = await getOrCreateChat(
        match.partner.id,
        match.partner.userId,
        {
          myEmail: match.myContact.email,
          partnerEmail: match.partnerContact.email,
        }
      );
      router.push({
        pathname: "/chat/[chatId]",
        params: { chatId: chat.id, matchId: requestId },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to open chat");
      console.error("Chat error:", error);
    }
  };

  const handleDismissMatch = async (requestId) => {
    Alert.alert(
      "Complete Match",
      "Mark as completed after successfully exchanging items. This will close the chat.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              const request = requests.find(r => r.id === requestId);
              if (request) {
                const match = request.matches?.find(m => m.status === "matched");
                if (match) {
                  const chat = await getChatByMatchId(requestId);
                  if (chat) await closeChat(chat.id);
                }
              }
              await completeMatch(requestId);
              Alert.alert("Match Completed!", "Thank you for using our service!");
            } catch (err) {
              console.error(err);
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
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRequest(requestId);
              Alert.alert("Request deleted");
            } catch (err) {
              console.error(err);
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
        <Spacer height={70} />
        <ThemedText>Loading matches...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Spacer height={100} />
      <View style={styles.headerCard}>
        <ThemedText title style={styles.heading}>Request Matches</ThemedText>
        <ThemedText style={styles.subtitle}>See donors who match your requests!</ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items or schools..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#999"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <ThemedText style={styles.filterButtonText}>{showFilters ? "Hide" : "Filter"}</ThemedText>
        </TouchableOpacity>
      </View>

      {searchFocused && (
        <TouchableOpacity style={styles.hideKeyboardButton} onPress={() => Keyboard.dismiss()}>
          <Ionicons name="chevron-down-outline" size={16} color="#4A90E2" />
          <ThemedText style={styles.hideKeyboardText}>Hide Keyboard</ThemedText>
        </TouchableOpacity>
      )}

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
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setDropdownOpen(!dropdownOpen)}>
          <ThemedText>Sort by: {SORT_LABELS[sortMode]} ▼</ThemedText>
        </TouchableOpacity>
        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={styles.dropdownItem}
                onPress={() => { setSortMode(key); setDropdownOpen(false); }}
              >
                <ThemedText style={sortMode === key && styles.dropdownActiveText}>{label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Spacer height={10} />

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {requests.length === 0 && (
          <ThemedText style={styles.noMatch}>No requests yet. Create a request to get matches!</ThemedText>
        )}

        {requests.map((request) => {
          const filteredMatches = filterAndSortMatches(request);
          const mySpecsMap = buildSpecsMap(request);

          const pendingMatch = filteredMatches.find(
            (m) => m.status === "pending" && !m.partnerContact
          );
          const approvedMatch = filteredMatches.find(
            (m) => m.status === "pending" && m.partnerContact && !m.myContact
          );
          const completedMatch = filteredMatches.find(
            (m) => m.status === "matched" && m.myContact && m.partnerContact
          );
          const availableMatches = filteredMatches.filter((m) => !m.status || m._isTemporary);

          return (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestHeaderText}>
                  <ThemedText style={styles.requestTitle}>Requested Items:</ThemedText>
                  <ItemsWithSpecs
                    items={request.items || []}
                    specsMap={mySpecsMap}
                  />
                  <ThemedText style={styles.subtle}>
                    Location: {getLocationDisplay(request.location)}
                  </ThemedText>
                </View>
                {!pendingMatch && !approvedMatch && !completedMatch && (
                  <TouchableOpacity style={styles.deleteIconButton} onPress={() => handleDeleteRequest(request.id)}>
                    <ThemedText style={styles.deleteIconText}>×</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <Spacer height={10} />

              {approvedMatch && (
                <View style={styles.matchCard}>
                  <ThemedText style={styles.approvedTitle}>Donor Approved Your Request!</ThemedText>
                  <ThemedText style={styles.infoText}>Provide your contact info to complete the match.</ThemedText>
                  <Spacer height={8} />
                  <ThemedText style={styles.subtle}>
                    Donor contact available after you provide yours
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.selectButton, { marginTop: 10, backgroundColor: "#4CAF50" }]}
                    onPress={() => openContactModal(request.id)}
                  >
                    <ThemedText style={{ color: "white", fontWeight: "bold" }}>Provide Contact Info</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {completedMatch && (
                <View style={styles.contactCard}>
                  <View style={styles.contactHeader}>
                    <ThemedText style={styles.completeTitle}>Match Complete!</ThemedText>
                    <TouchableOpacity style={styles.dismissButton} onPress={() => handleDismissMatch(request.id)}>
                      <ThemedText style={styles.dismissButtonText}>✕</ThemedText>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.contactInfoBox}>
                    <ThemedText style={styles.sectionTitle}>Donor Contact:</ThemedText>
                    <ThemedText style={styles.contactDetail}>
                      Email: {completedMatch.partnerContact?.email || "Not provided"}
                    </ThemedText>
                  </View>

                  <Spacer height={8} />

                  <View style={styles.matchDetailsBox}>
                    <ThemedText style={styles.matchDetailLabel}>Matched Items:</ThemedText>
                    <ItemsWithSpecs
                      items={completedMatch.items || []}
                      specsMap={buildSpecsMap(completedMatch.partner)}
                    />
                    <ThemedText style={[styles.matchDetailLabel, { marginTop: 8 }]}>Donor School:</ThemedText>
                    <ThemedText style={styles.matchDetailText}>{getSchoolDisplay(completedMatch.partner)}</ThemedText>
                  </View>

                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => handleOpenChat(request.id, completedMatch)}
                  >
                    <ThemedText style={styles.chatButtonText}>💬 Open Chat</ThemedText>
                  </TouchableOpacity>

                  <ThemedText style={styles.instructionText}>
                    Use chat to coordinate pickup. Tap X when complete.
                  </ThemedText>
                </View>
              )}

              {pendingMatch && !approvedMatch && !completedMatch && (
                <View style={styles.matchCard}>
                  <ThemedText style={styles.pendingTitle}>Waiting for Donor Response</ThemedText>
                  <ThemedText style={styles.infoText}>
                    You've selected a match. The donor will approve or deny your request soon.
                  </ThemedText>
                  <Spacer height={8} />
                  <ThemedText style={styles.subtle}>Donation Items:</ThemedText>
                  <ItemsWithSpecs
                    items={pendingMatch.partner?.items || []}
                    specsMap={buildSpecsMap(pendingMatch.partner)}
                  />
                  <ThemedText style={[styles.subtle, { marginTop: 4 }]}>
                    Match Score: {pendingMatch.score || 0}
                  </ThemedText>
                  <ThemedText style={styles.subtle}>
                    School: {getSchoolDisplay(pendingMatch.partner)}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.selectButton, { marginTop: 10, backgroundColor: "#FF6B6B", borderColor: "#FF6B6B" }]}
                    onPress={() => handleCancelPending(request.id)}
                  >
                    <ThemedText style={{ color: "white", fontWeight: "bold" }}>Cancel Pending Match</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.cancelHint}>Taking too long? You can cancel and try a different match.</ThemedText>
                </View>
              )}

              {!pendingMatch && !approvedMatch && !completedMatch && availableMatches.length > 0 && (
                <>
                  <ThemedText style={styles.instructionText}>
                    {availableMatches.length} potential {availableMatches.length === 1 ? "match" : "matches"} found! Select
                    ONE to send a request to the donor.
                  </ThemedText>
                  {availableMatches.slice(0, showAllMatches[request.id] ? undefined : 3).map((m, index) => (
                    <View key={m.id} style={styles.matchCard}>
                      <ThemedText style={styles.matchTitle}>Match #{index + 1}</ThemedText>
                      <ThemedText>
                        Score: {m.score || 0} | Items: {m.items?.length || 0}
                        {m.completeness !== undefined && ` | ${(m.completeness * 100).toFixed(0)}% match`}
                      </ThemedText>
                      <ThemedText style={styles.subtle}>Available:</ThemedText>
                      <ItemsWithSpecs
                        items={m.partner?.items || []}
                        specsMap={buildSpecsMap(m.partner)}
                      />
                      <ThemedText style={styles.subtle}>
                        Donation Location: {getLocationDisplay(m.partner?.location)}
                      </ThemedText>
                      <ThemedText style={styles.subtle}>
                        School: {getSchoolDisplay(m.partner)}
                      </ThemedText>
                      {m.quantitySufficient === false && (
                        <ThemedText style={styles.warningText}>Note: May not have full quantity needed</ThemedText>
                      )}
                      <TouchableOpacity style={[styles.selectButton, { marginTop: 8 }]} onPress={() => handleSelectMatch(m, request)}>
                        <ThemedText>Select this match</ThemedText>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {availableMatches.length > 3 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() => setShowAllMatches(prev => ({
                        ...prev,
                        [request.id]: !prev[request.id],
                      }))}
                    >
                      <ThemedText style={styles.showMoreText}>
                        {showAllMatches[request.id]
                          ? "Show Less"
                          : `Show ${availableMatches.length - 3} More Matches`}
                      </ThemedText>
                      <Ionicons
                        name={showAllMatches[request.id] ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#4A90E2"
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}

              {!pendingMatch && !approvedMatch && !completedMatch && availableMatches.length === 0 && (
                <ThemedText style={styles.noMatch}>No matches available yet. Check back soon!</ThemedText>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={contactModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText title style={{ marginBottom: 10 }}>Complete Your Match</ThemedText>
            <ThemedText style={styles.modalHint}>
              Provide your email address to exchange contact information.
            </ThemedText>
            <TextInput
              style={[styles.input, { color: "#111" }]}
              placeholder="Your Email *"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#666"
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.selectButton, { flex: 1, marginRight: 5, backgroundColor: "#4CAF50" }]}
                onPress={handleProvideContact}
              >
                <ThemedText style={{ color: "white", fontWeight: "bold" }}>Submit</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectButton, { flex: 1, marginLeft: 5, backgroundColor: "#f0f0f0", borderColor: "#ccc" }]}
                onPress={() => {
                  setContactModalVisible(false);
                  setContactEmail("");
                  setCurrentRequestId(null);
                }}
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
  container: { flex: 1, padding: 15, backgroundColor: "#dee6ff" },
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
    marginBottom: 10,
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
  },
  filterButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  filterButtonText: { color: "white", fontWeight: "bold" },
  filtersContainer: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  filterRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  filterLabel: { fontSize: 14, marginRight: 10, width: 80 },
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
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  requestHeaderText: { flex: 1 },
  deleteIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  deleteIconText: { color: "white", fontSize: 24, fontWeight: "bold", marginTop: -2 },
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
  matchCard: { backgroundColor: "white", padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: "#ddd" },
  matchTitle: { fontWeight: "bold", fontSize: 15 },
  approvedTitle: { fontWeight: "bold", fontSize: 16, color: "#4CAF50" },
  completeTitle: { fontWeight: "bold", fontSize: 16, color: "#2196F3" },
  contactCard: { backgroundColor: "#f0f7ff", padding: 16, borderRadius: 12, marginTop: 8, borderWidth: 2, borderColor: "#4A90E2" },
  contactHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  dismissButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FF6B6B", justifyContent: "center", alignItems: "center" },
  dismissButtonText: { color: "white", fontSize: 20, fontWeight: "bold" },
  contactInfoBox: { backgroundColor: "white", padding: 12, borderRadius: 8, marginBottom: 8 },
  contactDetail: { fontSize: 15, color: "#333", marginTop: 6, fontWeight: "500" },
  matchDetailsBox: { backgroundColor: "#ffffff", padding: 10, borderRadius: 8, marginBottom: 8 },
  matchDetailLabel: { fontSize: 13, fontWeight: "bold", color: "#666", marginBottom: 4 },
  matchDetailText: { fontSize: 14, color: "#333" },
  chatButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chatButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  pendingTitle: { fontWeight: "bold", fontSize: 16, color: "#FF9800" },
  sectionTitle: { fontWeight: "bold", fontSize: 14, marginTop: 8, marginBottom: 4 },
  infoText: { fontSize: 13, color: "#555", marginTop: 4, fontStyle: "italic" },
  cancelHint: { fontSize: 12, color: "#666", marginTop: 6, textAlign: "center", fontStyle: "italic" },
  warningText: { fontSize: 12, color: "#FF9800", marginTop: 4, fontStyle: "italic" },
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
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
  },
  showMoreText: { color: "#4A90E2", fontSize: 14, fontWeight: "600" },
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
    alignSelf: "center",
  },
  modalHint: { fontSize: 14, color: "#666", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: "#fff" },
  hideKeyboardButton: {
    flexDirection: "row",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginBottom: 20,
  },
  hideKeyboardText: { color: "#4A90E2", fontSize: 13, fontWeight: "500" },
  // Item + spec list styles (matching DonationList)
  itemSpecList: { marginTop: 4, gap: 2 },
  itemSpecRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  itemSpecItemName: { fontSize: 13, color: "#333", fontWeight: "500" },
  itemSpecDetail: { fontSize: 13, color: "#4A90E2", fontStyle: "italic", fontWeight: "400" },
});