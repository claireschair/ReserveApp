import { StyleSheet, ScrollView, TouchableOpacity, Linking, View } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';

import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";

const Wishlist = () => {
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWishlists();
  }, []);

  const loadWishlists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const querySnapshot = await getDocs(collection(db, 'teacher_wishlists'));
      const wishlistsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Shuffle the wishlists randomly
      const shuffled = wishlistsData.sort(() => Math.random() - 0.5);
      setWishlists(shuffled);
    } catch (err) {
      console.error("Error loading wishlists:", err);
      setError("Failed to load wishlists. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openAmazonLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        console.error("Failed to open URL:", err);
        alert("Could not open Amazon wishlist link");
      });
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <Spacer height={70} />
        <ThemedText>Loading wishlists...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <Spacer height={70} />
        <ThemedText style={styles.error}>{error}</ThemedText>
        <Spacer height={20} />
        <TouchableOpacity style={styles.retryButton} onPress={loadWishlists}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.pageContainer}>
      <Spacer height={70} />
      <View style={styles.headerCard}>
        <ThemedText style={styles.heading}>
          Teachers' Wishlists
        </ThemedText>
        <Spacer height={2} />
        <ThemedText style={styles.subtitle}>
          Support classrooms by donating needed supplies 
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {wishlists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No wishlists available yet.
            </ThemedText>
            <Spacer height={10} />
            <ThemedText style={styles.subtleText}>
              Check back soon!
            </ThemedText>
          </View>
        ) : (
          wishlists.map((wishlist) => {
            // Handle items array
            const itemsArray = Array.isArray(wishlist.items) 
              ? wishlist.items 
              : [];
            
            return (
              <View key={wishlist.id} style={styles.wishlistCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.profileCircle}>
                    <Ionicons name="school" size={18} color="#4F7BFF" />
                  </View>
                  <ThemedText style={styles.teacherName}>
                    {wishlist.name || "Anonymous Teacher"}
                  </ThemedText>
                </View>

                <Spacer height={10} />

                {itemsArray.length > 0 && (
                  <>
                    <ThemedText style={styles.sectionLabel}>Items Requested:</ThemedText>
                    <View style={styles.itemsContainer}>
                      {itemsArray.map((item, idx) => (
                        <View key={idx} style={styles.itemChip}>
                          <ThemedText style={styles.itemText}>• {item}</ThemedText>
                        </View>
                      ))}
                    </View>
                    <Spacer height={15} />
                  </>
                )}

                <TouchableOpacity
                  style={styles.amazonButton}
                  onPress={() => openAmazonLink(wishlist.amazonLink)}
                >
                  <ThemedText style={styles.amazonButtonText}>
                    View Amazon Wishlist →
                  </ThemedText>
                </TouchableOpacity>
              </View>
            );
          })
        )}
        <Spacer height={20} />
      </ScrollView>
    </ThemedView>
  );
};

export default Wishlist;

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: "#e6edf4"
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
  },
  headerCard: {
    backgroundColor: "#699cea",
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignSelf: "center",
    marginBottom: 35,
    width: "90%",
    shadowColor: "#4F7BFF",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    color: "#f0f4ff",
  },
  subtitle: {
    fontSize: 12,
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
  wishlistCard: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderColor: "#e0e0e0",
  },
  cardHeader: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#050c1f",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  itemsContainer: {
    gap: 6,
  },
  itemChip: {
    backgroundColor: "#F3F6FB",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#8abcf2",
  },
  itemText: {
    fontSize: 14,
    color: "#374151",
  },
  amazonButton: {
    backgroundColor: "#4888cb",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#5e6783",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  amazonButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
  },
  subtleText: {
    fontSize: 14,
    textAlign: "center",
    color: "#999",
  },
  error: {
    color: "#d32f2f",
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    paddingHorizontal: 30,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  profileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F1FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#aac2f2",
  },
});