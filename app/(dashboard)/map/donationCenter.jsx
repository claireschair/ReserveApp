import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import MapView, { Marker } from "react-native-maps";

import ThemedView from "../../../components/ThemedView";
import ThemedText from "../../../components/ThemedText";
import Spacer from "../../../components/Spacer";
import { useMap } from "../../../hooks/useMap";

import PlaceSearchInput from "./PlaceSearchInput";

const SelectDonationLocation = () => {
  const { saveDonationCenter } = useMap();

  const [items, setItems] = useState([]);
  const [itemInput, setItemInput] = useState("");
  const [location, setLocation] = useState(null);
  const [placeName, setPlaceName] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    if (itemInput.trim()) {
      setItems([...items, itemInput.trim()]);
      setItemInput("");
    }
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!location || !placeName) {
      setError("Please type the address of the donation center.");
      return;
    }

    try {
      setLoading(true);

      await saveDonationCenter(items, {
        name: placeName,
        lat: location.latitude,
        lng: location.longitude,
        verified: false,
      });

      setItems([]);
      setItemInput("");
      setLocation(null);
      setPlaceName(null);

      alert("Donation center added!");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchOverlay}>
        <PlaceSearchInput
          onSelect={({ name, latitude, longitude }) => {
            setPlaceName(name);
            setLocation({ latitude, longitude });
          }}
        />
      </View>

      <MapView
        style={styles.map}
        region={
          location && {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
        }
      >
        {location && <Marker coordinate={location} title={placeName} />}
      </MapView>

      <View style={styles.form}>
        <ThemedText style={styles.label}>
          Items Accepted (Optional):
        </ThemedText>
        <Spacer height={8} />

        <View style={styles.itemInputWrapper}>
          <TextInput
            style={[styles.input, styles.itemInput]}
            placeholder="e.g., Crayons"
            value={itemInput}
            onChangeText={setItemInput}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
          />
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddItem}
          >
            <ThemedText style={styles.addButtonText}>Add</ThemedText>
          </TouchableOpacity>
        </View>

        {items.length > 0 && (
          <View style={styles.itemsList}>
            {items.map((item, index) => (
              <View key={index} style={styles.itemChip}>
                <ThemedText style={styles.itemText}>{item}</ThemedText>
                <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                  <ThemedText style={styles.removeButton}>✕</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Spacer height={10} />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? "Adding..." : "Add Donation Center"}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
};

export default SelectDonationLocation;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchOverlay: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  map: {
    flex: 1,
  },
  form: {
    padding: 16,
    backgroundColor: "white",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  itemInputWrapper: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "white",
    fontSize: 16,
    color: "#111",
  },
  itemInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 10,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  itemsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  itemChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E7FF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 8,
  },
  itemText: {
    fontSize: 14,
    color: "#4F46E5",
  },
  removeButton: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  error: {
    color: "red",
    marginTop: 8,
    textAlign: "center",
  },
});