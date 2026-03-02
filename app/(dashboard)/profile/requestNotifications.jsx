import { StyleSheet, ScrollView, View, TouchableOpacity, RefreshControl } from 'react-native';
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';

import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import { UserContext } from '../../../contexts/UserContext';
import { database } from '../../../lib/appwrite';
import { Query } from 'react-native-appwrite';



const RequestNotifications = () => {
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
      
      // Get matches where current user is the requestor
      const response = await database.listDocuments(
        ITEMS_DATABASE_ID,
        MATCHES_COLLECTION_ID,
        [
          Query.equal("requestorId", user.$id),
          Query.or([
            Query.equal("status", "approved"),
            Query.equal("status", "rejected")
          ]),
          Query.orderDesc("$updatedAt")
        ]
      );

      const notifs = response.documents.map(match => {
        if (match.status === "approved") {
          return {
            id: match.$id,
            type: "match_approved",
            message: "Your match request was approved!",
            match: match,
            createdAt: match.$updatedAt,
          };
        } else {
          return {
            id: match.$id,
            type: "match_rejected",
            message: "Your match request was declined.",
            match: match,
            createdAt: match.$updatedAt,
          };
        }
      });

      setNotifications(notifs);
    } catch (err) {
      console.error("Error loading request notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading notifications...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText title style={styles.heading}>
        Match Updates
      </ThemedText>
      <Spacer height={16} />

      {notifications.length > 0 && (
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>
            {notifications.length} update{notifications.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      )}

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
              No match updates
            </ThemedText>
            <Spacer height={10} />
            <ThemedText style={styles.emptySubtext}>
              When your matches are approved or declined, you'll see it here
            </ThemedText>
          </View>
        ) : (
          notifications.map((notif) => {
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

                {isApproved && (
                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => router.push('/receive/requestlist')}
                  >
                    <ThemedText style={styles.viewDetailsText}>
                      View Contact Info →
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </ThemedView>
  );
};

export default RequestNotifications;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  heading: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  badge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 10,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
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
    textAlign: "center",
  },
});