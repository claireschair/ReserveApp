import { StyleSheet, ScrollView, View, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';

import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import { UserContext } from '../../../contexts/UserContext';
import { database } from '../../../lib/appwrite';
import { Query } from 'react-native-appwrite';

const MATCHES_DB_ID = "6946ce09003051fcb9a2";
const MATCHES_COLLECTION_ID = "matches";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(UserContext);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Get matches where user is involved
      const response = await database.listDocuments(
        MATCHES_DB_ID,
        MATCHES_COLLECTION_ID,
        [
          Query.or([
            Query.equal("donorId", user.$id),
            Query.equal("requestorId", user.$id)
          ]),
          Query.orderDesc("$createdAt")
        ]
      );

      // Filter and format notifications
      const notifs = response.documents
        .map(match => {
          // Donor notifications: new match requests (status: pending)
          if (match.donorId === user.$id && match.status === "pending") {
            return {
              id: match.$id,
              type: "match_request",
              message: "You have a new match request!",
              match: match,
              createdAt: match.$createdAt,
            };
          }
          
          // Requestor notifications: match approved or rejected
          if (match.requestorId === user.$id && match.status === "approved") {
            return {
              id: match.$id,
              type: "match_approved",
              message: "Your match request was approved!",
              match: match,
              createdAt: match.$updatedAt,
            };
          }
          
          if (match.requestorId === user.$id && match.status === "rejected") {
            return {
              id: match.$id,
              type: "match_rejected",
              message: "Your match request was declined.",
              match: match,
              createdAt: match.$updatedAt,
            };
          }
          
          return null;
        })
        .filter(Boolean);

      setNotifications(notifs);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleApproveMatch = async (matchId) => {
    try {
      await database.updateDocument(
        MATCHES_DB_ID,
        MATCHES_COLLECTION_ID,
        matchId,
        { status: "approved" }
      );
      loadNotifications();
    } catch (err) {
      console.error("Error approving match:", err);
      alert("Failed to approve match");
    }
  };

  const handleRejectMatch = async (matchId) => {
    try {
      await database.updateDocument(
        MATCHES_DB_ID,
        MATCHES_COLLECTION_ID,
        matchId,
        { status: "rejected" }
      );
      loadNotifications();
    } catch (err) {
      console.error("Error rejecting match:", err);
      alert("Failed to reject match");
    }
  };

  const renderNotification = (notif) => {
    const isMatchRequest = notif.type === "match_request";
    const isApproved = notif.type === "match_approved";
    const isRejected = notif.type === "match_rejected";

    return (
      <View 
        key={notif.id} 
        style={[
          styles.notificationCard,
          isApproved && styles.approvedCard,
          isRejected && styles.rejectedCard,
        ]}
      >
        <View style={styles.notificationHeader}>
          <ThemedText style={styles.notificationTitle}>
            {isMatchRequest && "🔔 New Match Request"}
            {isApproved && "✅ Match Approved"}
            {isRejected && "❌ Match Declined"}
          </ThemedText>
          <ThemedText style={styles.timestamp}>
            {new Date(notif.createdAt).toLocaleDateString()}
          </ThemedText>
        </View>

        <Spacer height={8} />
        <ThemedText style={styles.message}>{notif.message}</ThemedText>

        <Spacer height={10} />

        {notif.match.items && notif.match.items.length > 0 && (
          <>
            <ThemedText style={styles.itemsLabel}>Items:</ThemedText>
            <View style={styles.itemsContainer}>
              {notif.match.items.map((item, idx) => (
                <View key={idx} style={styles.itemBadge}>
                  <ThemedText style={styles.itemBadgeText}>{item}</ThemedText>
                </View>
              ))}
            </View>
            <Spacer height={10} />
          </>
        )}

        {isMatchRequest && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveMatch(notif.match.$id)}
            >
              <ThemedText style={styles.actionButtonText}>Approve</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectMatch(notif.match.$id)}
            >
              <ThemedText style={styles.actionButtonText}>Decline</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {isApproved && (
          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => router.push('/receive/requestlist')}
          >
            <ThemedText style={styles.viewDetailsText}>View Details →</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Spacer />
        <ThemedText>Loading notifications...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Spacer />
      <ThemedText title style={styles.heading}>
        Notifications
      </ThemedText>
      <Spacer height={20} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>
              No notifications yet
            </ThemedText>
            <Spacer height={10} />
            <ThemedText style={styles.emptySubtext}>
              You'll see match requests and updates here
            </ThemedText>
          </View>
        ) : (
          notifications.map(renderNotification)
        )}
      </ScrollView>
    </ThemedView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  notificationCard: {
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  approvedCard: {
    borderLeftColor: "#34C759",
    backgroundColor: "#f0fdf4",
  },
  rejectedCard: {
    borderLeftColor: "#FF3B30",
    backgroundColor: "#fef2f2",
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  message: {
    fontSize: 14,
    color: "#333",
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  itemsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  itemBadge: {
    backgroundColor: "#E0F0FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemBadgeText: {
    fontSize: 12,
    color: "#007AFF",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#34C759",
  },
  rejectButton: {
    backgroundColor: "#FF3B30",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  viewDetailsButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  viewDetailsText: {
    color: "white",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
});