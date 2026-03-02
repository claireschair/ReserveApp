import { StyleSheet, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";

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

      {selectedCenter && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.detailsCard}
          onPress={() => setSelectedCenter(null)}
        >
          <ThemedText style={styles.centerTitle}>
            {selectedCenter.name}
          </ThemedText>

          <ThemedText>
            {selectedCenter.verified ? "Verified" : "Unverified"}
          </ThemedText>

          <ThemedText style={styles.sectionTitle}>Items Available:</ThemedText>

          {selectedCenter.items?.length ? (
            selectedCenter.items.map((item, idx) => (
              <ThemedText key={idx}>• {item}</ThemedText>
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
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#2065b4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
  },

  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  detailsCard: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    elevation: 6,
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
});
