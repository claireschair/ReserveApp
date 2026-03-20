import { useEffect, useState, useContext } from "react";
import { StyleSheet, ScrollView, View, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useMatch } from "../../../hooks/useMatch";
import { UserContext } from "../../../contexts/UserContext";
import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import { Ionicons } from "@expo/vector-icons";

const ITEMS_PER_PAGE = 5;

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

const ReceiveHistory = () => {
  const { getCompletedMatches } = useMatch();
  const { user } = useContext(UserContext);
  
  const [completedRequests, setCompletedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const loadHistory = async () => {
    try {
      const data = await getCompletedMatches("receive");
      setCompletedRequests(data || []);
    } catch (err) {
      console.error("Error loading request history:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user?.uid) {
      loadHistory();
    }
  }, [user?.uid]);

  // Pagination calculations
  const totalPages = Math.ceil(completedRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRequests = completedRequests.slice(startIndex, endIndex);

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Spacer height={70} />
        <ThemedText>Loading request history...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.pageContainer}>
      <Spacer height={100} />
      <View style={styles.headerCard}>
        <ThemedText title style={styles.heading}>
          Request History
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          View your completed requests
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {completedRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#ccc" />
            <Spacer height={15} />
            <ThemedText style={styles.emptyText}>
              No completed requests yet
            </ThemedText>
            <Spacer height={5} />
            <ThemedText style={styles.subtleText}>
              Your completed requests will appear here
            </ThemedText>
          </View>
        ) : (
          <>
            {currentRequests.map((request) => {
              const match = request.match;
              const completedDate = request.completedAt 
                ? new Date(request.completedAt.seconds * 1000).toLocaleDateString()
                : "Unknown date";

              return (
                <View key={request.id} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <ThemedText style={styles.statusText}>Completed</ThemedText>
                    </View>
                    <ThemedText style={styles.dateText}>{completedDate}</ThemedText>
                  </View>

                  <Spacer height={12} />

                  <ThemedText style={styles.sectionLabel}>Requested Items:</ThemedText>
                  <ThemedText style={styles.itemsText}>
                    {(request.items || []).join(", ")}
                  </ThemedText>

                  <Spacer height={10} />

                  <ThemedText style={styles.sectionLabel}>Matched Items:</ThemedText>
                  <ThemedText style={styles.itemsText}>
                    {(match?.items || []).join(", ") || "N/A"}
                  </ThemedText>

                  <Spacer height={10} />

                  <View style={styles.detailsBox}>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={16} color="#666" />
                      <ThemedText style={styles.detailText}>
                        {getLocationDisplay(request.location)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="school-outline" size={16} color="#666" />
                      <ThemedText style={styles.detailText}>
                        {getSchoolDisplay(match?.partner)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="star-outline" size={16} color="#666" />
                      <ThemedText style={styles.detailText}>
                        Match Score: {match?.score || 0}
                      </ThemedText>
                    </View>
                  </View>

                  {match?.partnerContact?.email && (
                    <>
                      <Spacer height={10} />
                      <View style={styles.contactBox}>
                        <ThemedText style={styles.contactLabel}>Donor Contact:</ThemedText>
                        <ThemedText style={styles.contactEmail}>
                          {match.partnerContact.email}
                        </ThemedText>
                      </View>
                    </>
                  )}

                  {match?.chatId && (
                    <>
                      <Spacer height={10} />
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() =>
                          router.push({
                            pathname: "/chat/[chatId]",
                            params: { chatId: match.chatId, matchId: request.id },
                          })
                        }
                      >
                        <Ionicons name="chatbubbles-outline" size={18} color="#4A90E2" />
                        <ThemedText style={styles.chatButtonText}>View Chat History</ThemedText>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    currentPage === 1 && styles.navButtonDisabled,
                  ]}
                  onPress={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={currentPage === 1 ? "#ccc" : "#4A90E2"}
                  />
                </TouchableOpacity>

                <View style={styles.pageNumbersContainer}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <TouchableOpacity
                      key={pageNum}
                      style={[
                        styles.pageButton,
                        currentPage === pageNum && styles.pageButtonActive,
                      ]}
                      onPress={() => goToPage(pageNum)}
                    >
                      <ThemedText
                        style={[
                          styles.pageButtonText,
                          currentPage === pageNum && styles.pageButtonTextActive,
                        ]}
                      >
                        {pageNum}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    currentPage === totalPages && styles.navButtonDisabled,
                  ]}
                  onPress={goToNextPage}
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
          </>
        )}
        <Spacer height={20} />
      </ScrollView>
    </ThemedView>
  );
};

export default ReceiveHistory;

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: "#dee6ff",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#dee6ff",
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
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
    color: "white",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#e2f0ff",
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    textAlign: "center",
    color: "#666",
    fontWeight: "600",
  },
  subtleText: {
    fontSize: 14,
    textAlign: "center",
    color: "#999",
  },
  historyCard: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 18,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
  },
  dateText: {
    fontSize: 13,
    color: "#888",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  itemsText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 20,
  },
  detailsBox: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#555",
  },
  contactBox: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 10,
  },
  contactLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 14,
    color: "#1976D2",
    fontWeight: "500",
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#4A90E2",
  },
  chatButtonText: {
    color: "#4A90E2",
    fontSize: 15,
    fontWeight: "600",
  },
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
  navButtonDisabled: {
    borderColor: "#ccc",
    backgroundColor: "#f5f5f5",
  },
  pageNumbersContainer: {
    flexDirection: "row",
    gap: 6,
  },
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
  pageButtonActive: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  pageButtonTextActive: {
    color: "white",
  },
});