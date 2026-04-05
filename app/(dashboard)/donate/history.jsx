import { useEffect, useState, useContext } from "react";
import { StyleSheet, ScrollView, View, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useMatch } from "../../../hooks/useMatch";
import { useReview } from "../../../hooks/useReview";
import { UserContext } from "../../../contexts/UserContext";
import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import StarRating from "../../../components/StarRating";
import AppModal from "../../../components/AppModal";
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

const DonateHistory = () => {
  const { getCompletedMatches } = useMatch();
  const { submitReview, hasReviewed, getUserRating } = useReview();
  const { user } = useContext(UserContext);

  const [completedDonations, setCompletedDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewedMatchIds, setReviewedMatchIds] = useState({});
  const [partnerRatings, setPartnerRatings] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await getCompletedMatches("donate");
      setCompletedDonations(data || []);

      const reviewedMap = {};
      const ratingsMap = {};

      await Promise.all(
        (data || []).map(async (donation) => {
          const partnerUserId = donation.match?.partner?.userId;
          const [reviewed, rating] = await Promise.all([
            hasReviewed(donation.id),
            partnerUserId
              ? getUserRating(partnerUserId)
              : Promise.resolve({ ratingAverage: 0, ratingCount: 0 }),
          ]);
          reviewedMap[donation.id] = reviewed;
          if (partnerUserId) ratingsMap[partnerUserId] = rating;
        })
      );

      setReviewedMatchIds(reviewedMap);
      setPartnerRatings(ratingsMap);
    } catch (err) {
      console.error("Error loading donation history:", err);
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
    if (user?.uid) loadHistory();
  }, [user?.uid]);

  const handleOpenReview = (donation) => {
    setReviewTarget({
      matchId: donation.id,
      revieweeId: donation.match?.partner?.userId,
      partnerName: donation.match?.partner?.name || null,
    });
    setModalVisible(true);
  };

  const handleSubmitReview = async (rating, comment) => {
    if (!reviewTarget) return;
    setReviewLoading(true);
    try {
      await submitReview(reviewTarget.revieweeId, reviewTarget.matchId, rating, comment);
      setReviewedMatchIds((prev) => ({ ...prev, [reviewTarget.matchId]: true }));
      setModalVisible(false);
      setReviewTarget(null);
      Alert.alert("Review submitted", "Thank you for your feedback.");
    } catch (err) {
      console.error("Error submitting review:", err);
      Alert.alert("Error", err.message || "Failed to submit review.");
    } finally {
      setReviewLoading(false);
    }
  };

  const totalPages = Math.ceil(completedDonations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentDonations = completedDonations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Spacer height={70} />
        <ThemedText>Loading donation history...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.pageContainer}>
      <Spacer height={100} />
      <View style={styles.headerCard}>
        <ThemedText title style={styles.heading}>Donation History</ThemedText>
        <ThemedText style={styles.subtitle}>View your completed donations</ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {completedDonations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#ccc" />
            <Spacer height={15} />
            <ThemedText style={styles.emptyText}>No completed donations yet</ThemedText>
            <Spacer height={5} />
            <ThemedText style={styles.subtleText}>
              Your completed donations will appear here
            </ThemedText>
          </View>
        ) : (
          <>
            {currentDonations.map((donation) => {
              const match = donation.match;
              const completedDate = donation.completedAt
                ? new Date(donation.completedAt.seconds * 1000).toLocaleDateString()
                : "Unknown date";
              const partnerUserId = match?.partner?.userId;
              const partnerName = match?.partner?.name;
              const partnerRating = partnerUserId ? partnerRatings[partnerUserId] : null;
              const alreadyReviewed = reviewedMatchIds[donation.id];
              const canReview = partnerUserId && !alreadyReviewed;

              return (
                <View key={donation.id} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <ThemedText style={styles.statusText}>Completed</ThemedText>
                    </View>
                    <ThemedText style={styles.dateText}>{completedDate}</ThemedText>
                  </View>

                  <Spacer height={12} />

                  <ThemedText style={styles.sectionLabel}>Donated Items:</ThemedText>
                  <ThemedText style={styles.itemsText}>
                    {(donation.items || []).join(", ")}
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
                        {getLocationDisplay(donation.location)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="school-outline" size={16} color="#666" />
                      <ThemedText style={styles.detailText}>
                        {getSchoolDisplay(match?.partner)}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="bar-chart-outline" size={16} color="#666" />
                      <ThemedText style={styles.detailText}>
                        Match Score: {match?.score || 0}
                      </ThemedText>
                    </View>
                    {partnerRating && partnerRating.ratingCount > 0 && (
                      <View style={styles.detailRow}>
                        <Ionicons name="star-outline" size={16} color="#666" />
                        <View style={{ marginLeft: 2 }}>
                          <StarRating
                            rating={partnerRating.ratingAverage}
                            count={partnerRating.ratingCount}
                            size={14}
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  {(partnerName || match?.partnerContact?.email) && (
                    <>
                      <Spacer height={10} />
                      <View style={styles.contactBox}>
                        <ThemedText style={styles.contactLabel}>Requestor Contact:</ThemedText>
                        {partnerName && (
                          <ThemedText style={styles.contactName}>{partnerName}</ThemedText>
                        )}
                        {match?.partnerContact?.email && (
                          <ThemedText style={styles.contactEmail}>
                            {match.partnerContact.email}
                          </ThemedText>
                        )}
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
                            params: { chatId: match.chatId, matchId: donation.id },
                          })
                        }
                      >
                        <Ionicons name="chatbubbles-outline" size={18} color="#4A90E2" />
                        <ThemedText style={styles.chatButtonText}>View Chat History</ThemedText>
                      </TouchableOpacity>
                    </>
                  )}

                  <Spacer height={10} />

                  {alreadyReviewed ? (
                    <View style={styles.reviewedBadge}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                      <ThemedText style={styles.reviewedText}>Review submitted</ThemedText>
                    </View>
                  ) : canReview ? (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={() => handleOpenReview(donation)}
                    >
                      <Ionicons name="star-outline" size={16} color="#E8920A" />
                      <ThemedText style={styles.reviewButtonText}>Rate your experience</ThemedText>
                    </TouchableOpacity>
                  ) : null}
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
                      style={[styles.pageButton, currentPage === pageNum && styles.pageButtonActive]}
                      onPress={() => setCurrentPage(pageNum)}
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
          </>
        )}
        <Spacer height={20} />
      </ScrollView>

      <AppModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setReviewTarget(null);
        }}
        mode="review"
        loading={reviewLoading}
        onSubmitReview={handleSubmitReview}
        partnerName={reviewTarget?.partnerName}
      />
    </ThemedView>
  );
};

export default DonateHistory;

const styles = StyleSheet.create({
  pageContainer: { flex: 1, padding: 15, backgroundColor: "#dee6ff" },
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#dee6ff" },
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
  heading: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 5, color: "white" },
  subtitle: { fontSize: 15, textAlign: "center", color: "#e2f0ff", lineHeight: 22 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 18, textAlign: "center", color: "#666", fontWeight: "600" },
  subtleText: { fontSize: 14, textAlign: "center", color: "#999" },
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
  statusText: { fontSize: 13, fontWeight: "600", color: "#4CAF50" },
  dateText: { fontSize: 13, color: "#888" },
  sectionLabel: { fontSize: 14, fontWeight: "bold", color: "#666", marginBottom: 4 },
  itemsText: { fontSize: 15, color: "#333", lineHeight: 20 },
  detailsBox: { backgroundColor: "#F5F5F5", padding: 12, borderRadius: 10, gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 14, color: "#555" },
  contactBox: { backgroundColor: "#E3F2FD", padding: 12, borderRadius: 10 },
  contactLabel: { fontSize: 13, fontWeight: "bold", color: "#555", marginBottom: 6 },
  contactName: { fontSize: 15, color: "#1565C0", fontWeight: "600", marginBottom: 2 },
  contactEmail: { fontSize: 14, color: "#1976D2", fontWeight: "500" },
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
  chatButtonText: { color: "#4A90E2", fontSize: 15, fontWeight: "600" },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E1",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F5A623",
  },
  reviewButtonText: { color: "#E8920A", fontSize: 15, fontWeight: "600" },
  reviewedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  reviewedText: { fontSize: 14, color: "#4CAF50", fontWeight: "500" },
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