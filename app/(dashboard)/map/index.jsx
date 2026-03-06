import { StyleSheet, TouchableOpacity, View} from "react-native";
import { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Spacer from "../../../components/Spacer";

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
        setCenters(data);
      } catch (e) {
        console.log("Error fetching centers:", e);
      }
    })();
  }, []);

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
        {centers.map((center) => (
          <Marker
            key={center.$id}
            coordinate={{
              latitude: center.lat,
              longitude: center.lng,
            }}
            title={center.name}
            pinColor={center.verified ? "green" : "red"}
            onPress={() => setSelectedCenter(center)}
          />
        ))}
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
          <ThemedText style={styles.centerTitle}>
            {selectedCenter.name}
          </ThemedText>

          <ThemedText
            style={[
              styles.statusBadge,
              { backgroundColor: selectedCenter.verified ? "#51db83" : "#f47474" },
            ]}
          >
            {selectedCenter.verified ? "Verified" : "Unverified"}
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>Items Available:</ThemedText>

          {selectedCenter.items?.length ? (
            selectedCenter.items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Ionicons name="cube-outline" size={16} color="#4A90E2" />
                <ThemedText style={styles.itemText}>{item}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText>No items listed</ThemedText>
          )}

          <ThemedText style={styles.closeHint}>Tap to close</ThemedText>
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
  container: { flex: 1 },
  map: { flex: 1 },

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
  },
  centerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  status: {
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 8,
    fontWeight: "600",
  },
  closeHint: {
    marginTop: 10,
    textAlign: "right",
    color: "#4F46E5",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    color: "white",
    fontWeight: "600",
    marginTop: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  itemText: {
    marginLeft: 6,
  },
  floatingHeader: {
    marginTop: 25,
    position: "absolute",
    top: 40,
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
