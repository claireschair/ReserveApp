import { StyleSheet, TouchableOpacity, View, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import ThemedView from "../../../components/ThemedView";
import ThemedText from "../../../components/ThemedText";
import { useMap } from "../../../hooks/useMap";

const Map = () => {
  const { getDonationCenters } = useMap();
  const router = useRouter();

  const [location, setLocation] = useState(null);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getDonationCenters();
        console.log("RAW donation centers:", data);
        
        const now = new Date();
        const activeCenters = data.filter(center => {
          if (!center.startDate || !center.endDate) return true;
          
          const start = new Date(center.startDate);
          const end = new Date(center.endDate);
          
          return now >= start && now <= end;
        });
        
        console.log("Active donation centers:", activeCenters);
        setCenters(activeCenters);
      } catch (e) {
        console.log("Error fetching centers:", e);
      }
    })();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysRemaining = (endDateString) => {
    if (!endDateString) return null;
    const now = new Date();
    const end = new Date(endDateString);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <ThemedView style={styles.container}>
      <MapView
        style={styles.map}
        region={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : undefined
        }
        showsUserLocation
      >
        {centers.map((center) => {
          if (!center || !center.lat || !center.lng) {
            console.warn('Invalid center data:', center);
            return null;
          }

          return (
            <Marker
              key={center.$id || center.id}
              coordinate={{
                latitude: parseFloat(center.lat),
                longitude: parseFloat(center.lng),
              }}
              title={center.name}
              pinColor={center.verified ? "green" : "red"}
              onPress={() => setSelectedCenter(center)}
            />
          );
        })}
      </MapView>
      
      <View style={styles.floatingHeader}>
        <ThemedText style={styles.headerTitle}>
          Nearby Donation Centers
        </ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          Find where to donate or pick up school supplies
        </ThemedText>
      </View>

      {selectedCenter && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.detailsCard}
          onPress={() => setSelectedCenter(null)}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.centerTitle}>
              {selectedCenter.name}
            </ThemedText>

            <View style={styles.badgeRow}>
              <ThemedText
                style={[
                  styles.statusBadge,
                  { backgroundColor: selectedCenter.verified ? "#51db83" : "#f47474" },
                ]}
              >
                {selectedCenter.verified ? "✓ Verified" : "Unverified"}
              </ThemedText>

              {selectedCenter.startDate && selectedCenter.endDate && (
                <View style={styles.daysRemainingBadge}>
                  <Ionicons name="time-outline" size={14} color="#FF6B6B" />
                  <ThemedText style={styles.daysRemainingText}>
                    {getDaysRemaining(selectedCenter.endDate)} days left
                  </ThemedText>
                </View>
              )}
            </View>

            {selectedCenter.startDate && selectedCenter.endDate && (
              <View style={styles.dateInfoCard}>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar-outline" size={18} color="#4A90E2" />
                  <ThemedText style={styles.dateLabel}>Drive Duration:</ThemedText>
                </View>
                <View style={styles.dateRangeContainer}>
                  <View style={styles.singleDateContainer}>
                    <ThemedText style={styles.dateType}>Start</ThemedText>
                    <ThemedText style={styles.dateValue}>
                      {formatDate(selectedCenter.startDate)}
                    </ThemedText>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
                  <View style={styles.singleDateContainer}>
                    <ThemedText style={styles.dateType}>End</ThemedText>
                    <ThemedText style={styles.dateValue}>
                      {formatDate(selectedCenter.endDate)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}

            <ThemedText style={styles.sectionTitle}>Items Available:</ThemedText>

            {selectedCenter.items?.length ? (
              selectedCenter.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Ionicons name="cube-outline" size={16} color="#4A90E2" />
                  <ThemedText style={styles.itemText}>{item}</ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={styles.noItemsText}>No items listed</ThemedText>
            )}

            <ThemedText style={styles.closeHint}>Tap to close</ThemedText>
          </ScrollView>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/(dashboard)/map/donationCenter")}
      >
        <ThemedText style={styles.addButtonText}>+ Add Donation Center</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

export default Map;

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  map: { 
    flex: 1 
  },
  addButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",         
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(90, 167, 255, 0.9)",   
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 35,           
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#5874ce",
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  detailsCard: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "white",
    padding: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    maxHeight: 400,
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  daysRemainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  daysRemainingText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  dateInfoCard: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  singleDateContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateType: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 4,
    marginBottom: 8,
    fontWeight: "600",
    fontSize: 15,
    color: '#374151',
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 2,
  },
  itemText: {
    marginLeft: 6,
    fontSize: 14,
  },
  noItemsText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  closeHint: {
    marginTop: 12,
    textAlign: "right",
    color: "#4F46E5",
    fontSize: 13,
    fontWeight: '500',
  },
  floatingHeader: {
    position: "absolute",
    top: 65,
    left: 20,
    right: 20,
    backgroundColor: "rgba(46, 134, 235, 0.9)", 
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    borderWidth: 1.5,
    borderColor: "#243a80",
  },  
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "white",
    textAlign: "center",
    marginTop: 4,
  },
});