import { useEffect, useState, useContext } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  Keyboard,
} from "react-native";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { router } from "expo-router";
import { db } from "../../../lib/firebase";
import { useMatch } from "../../../hooks/useMatch";
import { useChat } from "../../../hooks/useChat";
import { UserContext } from "../../../contexts/UserContext";
import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import AppModal from "../../../components/AppModal";
import { Ionicons } from "@expo/vector-icons";

const REQUESTS_PER_PAGE = 5;

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

function buildQuantitiesMap(requestDoc) {
  const map = {};
  if (!requestDoc?.items || !requestDoc?.quantities) return map;
  requestDoc.items.forEach((item, idx) => {
    map[item.toLowerCase()] = requestDoc.quantities[idx] || 1;
  });
  return map;
}

function ItemsWithSpecs({ items = [], specsMap = {}, quantitiesMap = {} }) {
  if (!items.length) return <ThemedText style={styles.subtle}>N/A</ThemedText>;
  return (
    <View style={styles.itemSpecList}>
      {items.map((item, idx) => {
        const spec = specsMap[item.toLowerCase()];
        const qty = quantitiesMap[item.toLowerCase()];
        return (
          <View key={idx} style={styles.itemSpecRow}>
            <ThemedText style={styles.itemSpecItemName}>
              {item}
              {qty > 0 && <ThemedText style={styles.itemSpecQty}> ({qty})</ThemedText>}
              {!!spec && <ThemedText style={styles.itemSpecDetail}> — {spec}</ThemedText>}
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
  const { getOrCreateChat, getChatByMatchId, markChatAsCompleted } = useChat();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [completionTargetId, setCompletionTargetId] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionMatchedItems, setCompletionMatchedItems] = useState([]);

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

    const previousStates = new Map();

    const myRequestsQuery = query(
      collection(db, "requests"),
      where("userId", "==", user.uid),
      where("type", "==", "receive")
    );

    const unsubscribeMyRequests = onSnapshot(
      myRequestsQuery,
      async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === "modified") {
            const docId = change.doc.id;
            const newData = change.doc.data();
            const prevData = previousStates.get(docId);

            if (
              prevData &&
              prevData.status !== "completed" &&
              newData.status === "completed" &&
              newData.completedBy &&
              newData.completedBy !== user.uid
            ) {
              setTimeout(async () => {
                const checkForResubmit = query(
                  collection(db, "requests"),
                  where("userId", "==", user.uid),
                  where("type", "==", "receive"),
                  where("isAutoResubmit", "==", true),
                  where("status", "==", "active")
                );
                const resubmitSnapshot = await getDocs(checkForResubmit);
                const resubmits = resubmitSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                const now = Date.now() / 1000;
                const recentResubmit = resubmits.find(
                  (r) => r.createdAt?.seconds && now - r.createdAt.seconds < 30
                );
                if (recentResubmit) {
                  Alert.alert(
                    "Match Closed",
                    `Your match was closed by your partner. A new request was created with your ${recentResubmit.items.length} remaining item(s).`,
                    [{ text: "OK" }]
                  );
                } else {
                  Alert.alert("Match Closed", "Your match was closed by your partner.", [{ text: "OK" }]);
                }
              }, 2000);
            }

            previousStates.set(docId, { ...newData });
          }

          if (change.type === "added") {
            previousStates.set(change.doc.id, { ...change.doc.data() });
          }
        });

        loadRequests();
      },
      (error) => { console.error("Error listening to my requests:", error); }
    );

    const donationsQuery = query(collection(db, "requests"), where("type", "==", "donate"));
    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      () => { loadRequests(); },
      (error) => { console.error("Error listening to donations:", error); }
    );

    return () => {
      unsubscribeMyRequests();
      unsubscribeDonations();
      previousStates.clear();
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
          donationItems.some((item) => item.toLowerCase().includes(search)) ||
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
      "Once selected, you will wait for the donor to approve. You can only have one pending match at a time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Select",
          onPress: async () => {
            try {
              if (match._isTemporary) {
                await createAndSelectMatch(request, match.partner);
              }
              Alert.alert("Match selected", "Waiting for donor to approve or deny your request.");
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
    Alert.alert("Cancel Pending Match?", "Are you sure? You will be able to select a different match.", [
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
    ]);
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
    if (!contactEmail.includes("@")) {
      Alert.alert("Error", "Please provide a valid email address.");
      return;
    }
    try {
      await provideRequestorContact(currentRequestId, { email: contactEmail });
      Alert.alert("Success", "Match complete. You can now coordinate with the donor.");
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
      const chat = await getOrCreateChat(match.partner.id, match.partner.userId, {
        myEmail: match.myContact.email,
        partnerEmail: match.partnerContact.email,
      });
      router.push({ pathname: "/chat/[chatId]", params: { chatId: chat.id, matchId: requestId } });
    } catch (error) {
      Alert.alert("Error", "Failed to open chat");
      console.error("Chat error:", error);
    }
  };

  const handleOpenCompletionModal = (requestId) => {
    const request = requests.find((r) => r.id === requestId);
    const match = request?.matches?.find((m) => m.status === "matched");
    const mySpecsMap = buildSpecsMap(request);

    const matched = (match?.items || []).map((itemName) => {
      const requestorIdx = (request?.items || []).findIndex(
        (i) => i.toLowerCase() === itemName.toLowerCase()
      );
      const donorIdx = (match?.partner?.items || []).findIndex(
        (i) => i.toLowerCase() === itemName.toLowerCase()
      );
      return {
        name: itemName,
        spec: mySpecsMap[itemName.toLowerCase()] || "",
        donorQty: donorIdx !== -1 ? (match?.partner?.quantities?.[donorIdx] || 1) : 1,
        requestorQty: requestorIdx !== -1 ? (request?.quantities?.[requestorIdx] || 1) : 1,
      };
    });

    setCompletionTargetId(requestId);
    setCompletionMatchedItems(matched);
    setCompletionModalVisible(true);
  };

  const handleConfirmCompletion = async (completionType, exchangedQuantities) => {
    setCompletionLoading(true);
    try {
      let chatId = null;
      const request = requests.find((r) => r.id === completionTargetId);
      if (request) {
        const match = request.matches?.find((m) => m.status === "matched");
        if (match && match.partner?.id) {
          const chat = await getChatByMatchId(match.partner.id);
          if (chat) {
            chatId = chat.id;
            await markChatAsCompleted(chat.id);
          }
        }
      }

      const result = await completeMatch(completionTargetId, chatId, completionType, exchangedQuantities);

      setCompletionModalVisible(false);
      setCompletionTargetId(null);
      setCompletionMatchedItems([]);

      if (completionType === "complete") {
        if (result?.requestorResubmitted && result.requestorLeftoverCount > 0) {
          Alert.alert(
            "Match Completed",
            `Your match is complete. A new request was created with your ${result.requestorLeftoverCount} remaining item(s).`
          );
        } else {
          Alert.alert("Match Completed", "Your match was successfully completed.");
        }
      } else if (completionType === "partial") {
        if (result?.requestorResubmitted && result.requestorLeftoverCount > 0) {
          Alert.alert(
            "Partial Exchange Recorded",
            `Match closed. A new request was created with your ${result.requestorLeftoverCount} unexchanged item(s).`
          );
        } else {
          Alert.alert("Partial Exchange Recorded", "Match closed.");
        }
      } else if (completionType === "nocoordination") {
        Alert.alert(
          "Match Closed",
          "Could not coordinate. A new request was created with all your items so you can find a new match."
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to close match.");
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    Alert.alert("Delete Request", "Are you sure? This cannot be undone.", [
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
    ]);
  };

  const clearFilters = () => {
    setSearchText("");
    setMinScore(0);
  };

  const totalPages = Math.ceil(requests.length / REQUESTS_PER_PAGE);
  const startIndex = (currentPage - 1) * REQUESTS_PER_PAGE;
  const currentRequests = requests.slice(startIndex, startIndex + REQUESTS_PER_PAGE);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
      <Spacer height={100} />

      <View style={styles.headerCard}>
        <ThemedText style={styles.heading}>Request Matches</ThemedText>
        <Spacer height={2} />
        <ThemedText style={styles.subtitle}>
          See donors who match your requests!
        </ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.loadingSearchBar} />
        <View style={styles.loadingFilterButton} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.loadingCard}>
  
            <View style={styles.loadingLineShort} />

            <Spacer height={10} />

            <View style={styles.loadingLine} />
            <View style={styles.loadingLine} />
            <View style={styles.loadingLineShort} />

            <Spacer height={12} />

            <View style={styles.loadingInnerCard}>
              <View style={styles.loadingLineShort} />
              <View style={styles.loadingLine} />
              <View style={styles.loadingLineShort} />

              <Spacer height={10} />

              <View style={styles.loadingButton} />
            </View>
          </View>
        ))}
      </ScrollView>
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
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
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

        {currentRequests.map((request) => {
          const filteredMatches = filterAndSortMatches(request);
          const mySpecsMap = buildSpecsMap(request);
          const myQuantitiesMap = buildQuantitiesMap(request);

          const pendingMatch = filteredMatches.find((m) => m.status === "pending" && !m.partnerContact);
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
                  <ItemsWithSpecs items={request.items || []} specsMap={mySpecsMap} quantitiesMap={myQuantitiesMap} />
                  <ThemedText style={styles.subtle}>
                    Location: {getLocationDisplay(request.location)}
                  </ThemedText>
                </View>
                {!pendingMatch && !approvedMatch && !completedMatch && (
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteRequest(request.id)}
                  >
                    <ThemedText style={styles.deleteIconText}>x</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <Spacer height={10} />

              {approvedMatch && (
                <View style={styles.matchCard}>
                  <ThemedText style={styles.approvedTitle}>Donor Approved Your Request</ThemedText>
                  <ThemedText style={styles.infoText}>
                    Provide your contact info to complete the match.
                  </ThemedText>
                  <Spacer height={8} />
                  <ThemedText style={styles.subtle}>
                    Donor contact available after you provide yours.
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
                  <ThemedText style={styles.completeTitle}>Match Ready</ThemedText>

                  <View style={styles.contactInfoBox}>
                    <ThemedText style={styles.sectionTitle}>Donor Contact:</ThemedText>
                    {completedMatch.partner?.name && (
                      <ThemedText style={styles.contactDetail}>
                        Name: {completedMatch.partner.name}
                      </ThemedText>
                    )}
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
                      quantitiesMap={buildQuantitiesMap(completedMatch.partner)}
                    />
                    <ThemedText style={[styles.matchDetailLabel, { marginTop: 8 }]}>Donor School:</ThemedText>
                    <ThemedText style={styles.matchDetailText}>{getSchoolDisplay(completedMatch.partner)}</ThemedText>
                  </View>

                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => handleOpenChat(request.id, completedMatch)}
                  >
                    <ThemedText style={styles.chatButtonText}>Open Chat</ThemedText>
                  </TouchableOpacity>

                  <ThemedText style={styles.instructionText}>
                    Use chat to coordinate pickup.
                  </ThemedText>

                  <TouchableOpacity
                    style={styles.closeMatchButton}
                    onPress={() => handleOpenCompletionModal(request.id)}
                  >
                    <ThemedText style={styles.closeMatchButtonText}>Close Match</ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {pendingMatch && !approvedMatch && !completedMatch && (
                <View style={styles.matchCard}>
                  <ThemedText style={styles.pendingTitle}>Waiting for Donor Response</ThemedText>
                  <ThemedText style={styles.infoText}>
                    You have selected a match. The donor will approve or deny your request soon.
                  </ThemedText>
                  <Spacer height={8} />
                  <ThemedText style={styles.subtle}>Donation Items:</ThemedText>
                  <ItemsWithSpecs
                    items={pendingMatch.partner?.items || []}
                    specsMap={buildSpecsMap(pendingMatch.partner)}
                    quantitiesMap={buildQuantitiesMap(pendingMatch.partner)}
                  />
                  <ThemedText style={[styles.subtle, { marginTop: 4 }]}>
                    Match Score: {pendingMatch.score || 0}
                  </ThemedText>
                  <ThemedText style={styles.subtle}>School: {getSchoolDisplay(pendingMatch.partner)}</ThemedText>
                  <TouchableOpacity
                    style={[styles.selectButton, { marginTop: 10, backgroundColor: "#FF6B6B", borderColor: "#FF6B6B" }]}
                    onPress={() => handleCancelPending(request.id)}
                  >
                    <ThemedText style={{ color: "white", fontWeight: "bold" }}>Cancel Pending Match</ThemedText>
                  </TouchableOpacity>
                  <ThemedText style={styles.cancelHint}>
                    Taking too long? You can cancel and try a different match.
                  </ThemedText>
                </View>
              )}

              {!pendingMatch && !approvedMatch && !completedMatch && availableMatches.length > 0 && (
                <>
                  <ThemedText style={styles.instructionText}>
                    {availableMatches.length} potential{" "}
                    {availableMatches.length === 1 ? "match" : "matches"} found. Select one to send a
                    request to the donor.
                  </ThemedText>
                  {availableMatches
                    .slice(0, showAllMatches[request.id] ? undefined : 3)
                    .map((m, index) => (
                      <View key={m.id} style={styles.matchCard}>
                        <ThemedText style={styles.matchTitle}>Match #{index + 1}</ThemedText>
                        <ThemedText>
                          Score: {m.score || 0} | Items: {m.items?.length || 0}
                          {m.completeness !== undefined && ` | ${(m.completeness * 100).toFixed(0)}% match`}
                        </ThemedText>
                        <ThemedText style={styles.subtle}>Available:</ThemedText>
                        <ItemsWithSpecs items={m.partner?.items || []} specsMap={buildSpecsMap(m.partner)} quantitiesMap={buildQuantitiesMap(m.partner)} />
                        <ThemedText style={styles.subtle}>
                          Donation Location: {getLocationDisplay(m.partner?.location)}
                        </ThemedText>
                        <ThemedText style={styles.subtle}>School: {getSchoolDisplay(m.partner)}</ThemedText>
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
                  {availableMatches.length > 3 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() =>
                        setShowAllMatches((prev) => ({ ...prev, [request.id]: !prev[request.id] }))
                      }
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

        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.navButton, currentPage === 1 && styles.navButtonDisabled]}
              onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? "#ccc" : "#4A90E2"} />
            </TouchableOpacity>

            <View style={styles.pageNumbersContainer}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <TouchableOpacity
                  key={pageNum}
                  style={[styles.pageButton, currentPage === pageNum && styles.pageButtonActive]}
                  onPress={() => setCurrentPage(pageNum)}
                >
                  <ThemedText
                    style={[styles.pageButtonText, currentPage === pageNum && styles.pageButtonTextActive]}
                  >
                    {pageNum}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.navButton, currentPage === totalPages && styles.navButtonDisabled]}
              onPress={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={currentPage === totalPages ? "#ccc" : "#4A90E2"}
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={contactModalVisible} animationType="slide" transparent>
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

      <AppModal
        visible={completionModalVisible}
        onClose={() => {
          setCompletionModalVisible(false);
          setCompletionTargetId(null);
          setCompletionMatchedItems([]);
        }}
        mode="completion"
        onConfirmCompletion={handleConfirmCompletion}
        loading={completionLoading}
        matchedItems={completionMatchedItems}
      />
    </ThemedView>
  );
};

export default RequestList;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#dee6ff" },
  heading: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 5, color: "white" },
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
  subtitle: { fontSize: 15, textAlign: "center", color: "#e2f0ff", lineHeight: 22 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterButton: { backgroundColor: "#4A90E2", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  filterButtonText: { color: "white", fontWeight: "bold" },
  filtersContainer: { backgroundColor: "#f5f5f5", padding: 12, borderRadius: 12, marginBottom: 10 },
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
  deleteIconText: { color: "white", fontSize: 18, fontWeight: "bold" },
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
  approvedTitle: { fontWeight: "bold", fontSize: 16, color: "#4CAF50" },
  completeTitle: { fontWeight: "bold", fontSize: 16, color: "#2196F3", marginBottom: 12 },
  contactCard: {
    backgroundColor: "#f0f7ff",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#4A90E2",
  },
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
  closeMatchButton: {
    backgroundColor: "white",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#ccc",
  },
  closeMatchButtonText: { color: "#555", fontSize: 15, fontWeight: "500" },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "white", borderRadius: 20, padding: 20, width: "85%", alignSelf: "center" },
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
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4A90E2",
  },
  navButtonDisabled: { borderColor: "#ccc", backgroundColor: "#f5f5f5" },
  pageNumbersContainer: { flexDirection: "row", gap: 6 },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pageButtonActive: { backgroundColor: "#4A90E2", borderColor: "#4A90E2" },
  pageButtonText: { fontSize: 14, fontWeight: "600", color: "#666" },
  pageButtonTextActive: { color: "white" },
  itemSpecList: { marginTop: 4, gap: 2 },
  itemSpecRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  itemSpecItemName: { fontSize: 13, color: "#333", fontWeight: "500" },
  itemSpecQty: { fontSize: 13, color: "#888", fontWeight: "400" },
  itemSpecDetail: { fontSize: 13, color: "#4A90E2", fontStyle: "italic", fontWeight: "400" },
  loadingCard: {
  backgroundColor: "#FFFFFF",
  padding: 18,
  borderRadius: 18,
  marginBottom: 20,
  opacity: 0.6,
},

loadingInnerCard: {
  backgroundColor: "#f4f7fb",
  padding: 12,
  borderRadius: 12,
  marginTop: 8,
},
loadingLine: {
  width: "90%",
  height: 12,
  backgroundColor: "#e6edf7",
  borderRadius: 6,
  marginTop: 6,
},
loadingLineShort: {
  width: "60%",
  height: 12,
  backgroundColor: "#e6edf7",
  borderRadius: 6,
},
loadingButton: {
  width: "100%",
  height: 40,
  backgroundColor: "#dbe6f5",
  borderRadius: 12,
},
loadingSearchBar: {
  flex: 1,
  height: 40,
  backgroundColor: "#e6edf7",
  borderRadius: 25,
},
loadingFilterButton: {
  width: 80,
  height: 40,
  backgroundColor: "#dbe6f5",
  borderRadius: 20,
},
});