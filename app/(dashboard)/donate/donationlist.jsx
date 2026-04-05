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

const DONATIONS_PER_PAGE = 5;

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
  recent: "Most Recent",
};

const DonationList = () => {
  const { getDonationsWithMatches, approveDonation, denyDonation, completeMatch, deleteDonation } =
    useMatch();
  const { getOrCreateChat, getChatByMatchId, markChatAsCompleted } = useChat();
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAllPending, setShowAllPending] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [completionTargetId, setCompletionTargetId] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionMatchedItems, setCompletionMatchedItems] = useState([]);

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

  useEffect(() => {
    if (user?.uid) loadDonations();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const previousStates = new Map();

    const myDonationsQuery = query(
      collection(db, "requests"),
      where("userId", "==", user.uid),
      where("type", "==", "donate")
    );

    const unsubscribeMyDonations = onSnapshot(
      myDonationsQuery,
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
                  where("type", "==", "donate"),
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
                    `Your match was closed by your partner. A new donation was created with your ${recentResubmit.items.length} remaining item(s).`,
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

        loadDonations();
      },
      (error) => { console.error("Error listening to my donations:", error); }
    );

    const receiveRequestsQuery = query(
      collection(db, "requests"),
      where("type", "==", "receive")
    );
    const unsubscribeReceiveRequests = onSnapshot(
      receiveRequestsQuery,
      () => { loadDonations(); },
      (error) => { console.error("Error listening to receive requests:", error); }
    );

    return () => {
      unsubscribeMyDonations();
      unsubscribeReceiveRequests();
      previousStates.clear();
    };
  }, [user?.uid]);

  const filterAndSortMatches = (donation) => {
    let matches = donation.matches || [];

    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      matches = matches.filter((m) => {
        const requestItems = m.partner?.items || [];
        const partnerSchool = m.partner?.school?.schoolName?.toLowerCase() || "";
        return (
          requestItems.some((item) => item.toLowerCase().includes(search)) ||
          partnerSchool.includes(search)
        );
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
    if (!contactEmail.trim()) {
      Alert.alert("Error", "Email address is required.");
      return;
    }
    if (!contactEmail.includes("@")) {
      Alert.alert("Error", "Please provide a valid email address.");
      return;
    }
    try {
      await approveDonation(currentRequestId, { email: contactEmail });
      Alert.alert("Match approved", "The requestor will provide their contact info next.");
      setContactModalVisible(false);
      setContactEmail("");
      setCurrentRequestId(null);
    } catch (err) {
      console.error("Error approving:", err);
      Alert.alert("Error", err.message || "Failed to approve match.");
    }
  };

  const handleOpenChat = async (donationId, match) => {
    try {
      const chat = await getOrCreateChat(donationId, match.partner.userId, {
        myEmail: match.myContact.email,
        partnerEmail: match.partnerContact.email,
      });
      router.push({ pathname: "/chat/[chatId]", params: { chatId: chat.id, matchId: donationId } });
    } catch (error) {
      Alert.alert("Error", "Failed to open chat");
      console.error("Chat error:", error);
    }
  };

  const handleOpenCompletionModal = (donationId) => {
    const donation = donations.find((d) => d.id === donationId);
    const match = donation?.matches?.find((m) => m.status === "matched");
    const mySpecsMap = buildSpecsMap(donation);

    const matched = (match?.items || []).map((itemName) => {
      const donorIdx = (donation?.items || []).findIndex(
        (i) => i.toLowerCase() === itemName.toLowerCase()
      );
      const requestorIdx = (match?.partner?.items || []).findIndex(
        (i) => i.toLowerCase() === itemName.toLowerCase()
      );
      return {
        name: itemName,
        spec: mySpecsMap[itemName.toLowerCase()] || "",
        donorQty: donorIdx !== -1 ? (donation?.quantities?.[donorIdx] || 1) : 1,
        requestorQty: requestorIdx !== -1 ? (match?.partner?.quantities?.[requestorIdx] || 1) : 1,
      };
    });

    setCompletionTargetId(donationId);
    setCompletionMatchedItems(matched);
    setCompletionModalVisible(true);
  };

  const handleConfirmCompletion = async (completionType, exchangedQuantities) => {
    setCompletionLoading(true);
    try {
      let chatId = null;
      const donation = donations.find((d) => d.id === completionTargetId);
      if (donation) {
        const match = donation.matches?.find((m) => m.status === "matched");
        if (match) {
          const chat = await getChatByMatchId(completionTargetId);
          if (chat) {
            chatId = chat.id;
            await markChatAsCompleted(chat.id);
          }
        }
      }

      const result = await completeMatch(completionTargetId, chatId, completionType, exchangedQuantities);

      setCompletionModalVisible(false);
      setCompletionTargetId(null);

      if (completionType === "complete") {
        if (result?.donorResubmitted && result.donorLeftoverCount > 0) {
          Alert.alert(
            "Match Completed",
            `Your match is complete. A new donation was created with your ${result.donorLeftoverCount} remaining item(s).`
          );
        } else {
          Alert.alert("Match Completed", "Your match was successfully completed.");
        }
      } else if (completionType === "partial") {
        if (result?.donorResubmitted && result.donorLeftoverCount > 0) {
          Alert.alert(
            "Partial Exchange Recorded",
            `Match closed. A new donation was created with your ${result.donorLeftoverCount} unexchanged item(s).`
          );
        } else {
          Alert.alert("Partial Exchange Recorded", "Match closed.");
        }
      } else if (completionType === "nocoordination") {
        Alert.alert(
          "Match Closed",
          "Could not coordinate. A new donation was created with all your items so you can find a new match."
        );
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to close match.");
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleDeleteDonation = async (requestId) => {
    Alert.alert("Delete Donation", "Are you sure? This cannot be undone.", [
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
    ]);
  };

  const clearFilters = () => {
    setSearchText("");
    setMinScore(0);
  };

  const totalPages = Math.ceil(donations.length / DONATIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * DONATIONS_PER_PAGE;
  const currentDonations = donations.slice(startIndex, startIndex + DONATIONS_PER_PAGE);

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
      <Spacer height={100} />
      <View style={styles.headerCard}>
        <ThemedText title style={styles.heading}>My Donations</ThemedText>
        <ThemedText style={styles.subtitle}>View your past and current donations!</ThemedText>
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
        {donations.length === 0 && (
          <ThemedText style={styles.noMatch}>No donations yet. Create one to help others!</ThemedText>
        )}

        {currentDonations.map((donation) => {
          const filteredMatches = filterAndSortMatches(donation);
          const mySpecsMap = buildSpecsMap(donation);
          const myQuantitiesMap = buildQuantitiesMap(donation);
          const myQuantitiesMap = buildQuantitiesMap(donation);

          const pendingRequests = filteredMatches.filter((m) => m.status === "pending" && !m.myContact);
          const waitingForRequestor = filteredMatches.filter(
            (m) => m.status === "pending" && m.myContact && !m.partnerContact
          );
          const completedMatches = filteredMatches.filter((m) => m.status === "matched" && m.partnerContact);

          const hasAnyMatch =
            pendingRequests.length > 0 || waitingForRequestor.length > 0 || completedMatches.length > 0;

          return (
            <View key={donation.id} style={styles.donationCard}>
              <View style={styles.donationHeader}>
                <View style={styles.donationHeaderText}>
                  <ThemedText style={styles.donationTitle}>Donation Items:</ThemedText>
                  <ItemsWithSpecs items={donation.items || []} specsMap={mySpecsMap} quantitiesMap={myQuantitiesMap} />
                  <ThemedText style={styles.subtle}>
                    Location: {getLocationDisplay(donation.location)}
                  </ThemedText>
                </View>
                {!hasAnyMatch && (
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteDonation(donation.id)}
                  >
                    <ThemedText style={styles.deleteIconText}>x</ThemedText>
                  </TouchableOpacity>
                )}
              </View>

              <Spacer height={10} />

              {pendingRequests.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>
                    Pending Requests ({pendingRequests.length}):
                  </ThemedText>
                  {pendingRequests
                    .slice(0, showAllPending[donation.id] ? undefined : 3)
                    .map((match) => (
                      <View key={match.id} style={styles.matchCard}>
                        <ThemedText style={styles.pendingTitle}>New Match Request</ThemedText>
                        <ThemedText style={styles.infoText}>
                          A requestor selected your donation. Approve or deny.
                        </ThemedText>
                        <Spacer height={8} />
                        <ThemedText style={styles.subtle}>Requested Items:</ThemedText>
                        <ItemsWithSpecs
                          items={match.partner?.items || []}
                          specsMap={buildSpecsMap(match.partner)}
                          quantitiesMap={buildQuantitiesMap(match.partner)}
                          quantitiesMap={buildQuantitiesMap(match.partner)}
                        />
                        <ThemedText style={[styles.subtle, { marginTop: 4 }]}>
                          Match Score: {match.score || 0}
                        </ThemedText>
                        <ThemedText style={styles.subtle}>School: {getSchoolDisplay(match.partner)}</ThemedText>
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
                  {pendingRequests.length > 3 && (
                    <TouchableOpacity
                      style={styles.showMoreButton}
                      onPress={() =>
                        setShowAllPending((prev) => ({ ...prev, [donation.id]: !prev[donation.id] }))
                      }
                    >
                      <ThemedText style={styles.showMoreText}>
                        {showAllPending[donation.id]
                          ? "Show Less"
                          : `Show ${pendingRequests.length - 3} More Requests`}
                      </ThemedText>
                      <Ionicons
                        name={showAllPending[donation.id] ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#4A90E2"
                      />
                    </TouchableOpacity>
                  )}
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
                        Your email: {match.myContact?.email || "Not provided"}
                      </ThemedText>
                      <ThemedText style={styles.subtle}>Requested Items:</ThemedText>
                      <ItemsWithSpecs
                        items={match.partner?.items || []}
                        specsMap={buildSpecsMap(match.partner)}
                        quantitiesMap={buildQuantitiesMap(match.partner)}
                        quantitiesMap={buildQuantitiesMap(match.partner)}
                      />
                      <ThemedText style={styles.subtle}>School: {getSchoolDisplay(match.partner)}</ThemedText>
                    </View>
                  ))}
                </>
              )}

              {completedMatches.length > 0 && (
                <>
                  <ThemedText style={styles.sectionTitle}>
                    Active Matches ({completedMatches.length}):
                  </ThemedText>
                  {completedMatches.map((match) => (
                    <View key={match.id} style={styles.contactCard}>
                      <ThemedText style={styles.completeTitle}>Match Ready</ThemedText>

                      <View style={styles.contactInfoBox}>
                        <ThemedText style={styles.sectionTitle}>Requestor Contact:</ThemedText>
                        {match.partner?.name && (
                          <ThemedText style={styles.contactDetail}>
                            Name: {match.partner.name}
                          </ThemedText>
                        )}
                        <ThemedText style={styles.contactDetail}>
                          Email: {match.partnerContact?.email || "N/A"}
                        </ThemedText>
                      </View>

                      <Spacer height={8} />

                      <View style={styles.matchDetailsBox}>
                        <ThemedText style={styles.matchDetailLabel}>Matched Items:</ThemedText>
                        <ItemsWithSpecs items={match.items || []} specsMap={mySpecsMap} quantitiesMap={myQuantitiesMap} />
                        <ThemedText style={[styles.matchDetailLabel, { marginTop: 8 }]}>School:</ThemedText>
                        <ThemedText style={styles.matchDetailText}>{getSchoolDisplay(match.partner)}</ThemedText>
                      </View>

                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => handleOpenChat(donation.id, match)}
                      >
                        <ThemedText style={styles.chatButtonText}>Open Chat</ThemedText>
                      </TouchableOpacity>

                      <ThemedText style={styles.instructionText}>
                        Use chat to coordinate pickup or delivery.
                      </ThemedText>

                      <TouchableOpacity
                        style={styles.closeMatchButton}
                        onPress={() => handleOpenCompletionModal(donation.id)}
                      >
                        <ThemedText style={styles.closeMatchButtonText}>Close Match</ThemedText>
                      </TouchableOpacity>
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
            <ThemedText title style={{ marginBottom: 10 }}>Approve Match</ThemedText>
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
                style={[styles.actionButton, styles.approveButton, { flex: 1, marginRight: 5 }]}
                onPress={submitApproval}
              >
                <ThemedText style={styles.buttonText}>Submit</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { flex: 1, marginLeft: 5, backgroundColor: "#f0f0f0", borderColor: "#ccc" },
                ]}
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

export default DonationList;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#dee6ff" },
  heading: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 5, color: "white" },
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
  subtitle: { fontSize: 15, textAlign: "center", color: "#e2f0ff", lineHeight: 22 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
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
  filterButton: { backgroundColor: "#4A90E2", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  filterButtonText: { color: "white", fontWeight: "bold" },
  filtersContainer: { backgroundColor: "white", padding: 14, borderRadius: 14, marginBottom: 12 },
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
  deleteIconText: { color: "white", fontSize: 18, fontWeight: "bold" },
  sectionTitle: { fontWeight: "bold", fontSize: 14, marginTop: 12, marginBottom: 8 },
  noMatch: { color: "#777", fontStyle: "italic", marginTop: 8 },
  matchCard: { backgroundColor: "#f8fbff", padding: 14, borderRadius: 14, marginTop: 10 },
  pendingTitle: { fontWeight: "bold", fontSize: 16, color: "#FF9800" },
  approvedTitle: { fontWeight: "bold", fontSize: 16, color: "#4CAF50" },
  completeTitle: { fontWeight: "bold", fontSize: 16, color: "#2196F3", marginBottom: 12 },
  contactCard: {
    backgroundColor: "#f0f7ff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
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
  instructionText: { fontSize: 13, color: "#555", fontStyle: "italic", marginTop: 8 },
  infoText: { fontSize: 13, color: "#555", marginTop: 4, fontStyle: "italic" },
  subtle: { fontSize: 12, color: "#666", marginTop: 2 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 8 },
  actionButton: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  approveButton: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  denyButton: { backgroundColor: "#FF6B6B", borderColor: "#FF6B6B" },
  buttonText: { color: "white", fontWeight: "bold" },
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
  itemSpecList: { marginTop: 4, gap: 2 },
  itemSpecRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  itemSpecItemName: { fontSize: 13, color: "#333", fontWeight: "500" },
  itemSpecQty: { fontSize: 13, color: "#888", fontWeight: "400" },
  itemSpecQty: { fontSize: 13, color: "#888", fontWeight: "400" },
  itemSpecDetail: { fontSize: 13, color: "#4A90E2", fontStyle: "italic", fontWeight: "400" },
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
});