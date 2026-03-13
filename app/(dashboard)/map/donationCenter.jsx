import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  View,
  Keyboard,
  Animated,
  Platform,
} from "react-native";
import { useState, useEffect, useRef } from "react";
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

  // Animated bottom value
  const animatedBottom = useRef(new Animated.Value(20)).current;

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

  const handleFocus = (e) => {
    const keyboardHeight = e?.endCoordinates?.height || 250;
    const finalHeight = Math.min(keyboardHeight, 250);
    Animated.timing(animatedBottom, {
      toValue: finalHeight + 20,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    Animated.timing(animatedBottom, {
      toValue: 20,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", handleFocus);
    const hideSub = Keyboard.addListener("keyboardDidHide", handleBlur);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchOverlay}>
        <PlaceSearchInput
          onSelect={({ name, latitude, longitude }) => {
            setPlaceName(name);
            setLocation({ latitude, longitude });
          }}
        />
        <ThemedText style={styles.subtitle}>
          Select a location on the map and list items accepted
        </ThemedText>
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

      <Animated.View style={[styles.form, { bottom: animatedBottom }]}>
        <ThemedText style={styles.label}>Items Accepted (Optional):</ThemedText>
        <Spacer height={4} />
        {placeName && (
          <ThemedText style={styles.locationText}>📍 {placeName}</ThemedText>
        )}
        <Spacer height={3} />

        <View style={styles.itemInputWrapper}>
          <TextInput
            style={[styles.input, styles.itemInput]}
            placeholder="e.g., Crayons"
            value={itemInput}
            onChangeText={setItemInput}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
            onFocus={handleFocus} 
            onBlur={handleBlur}   
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
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

                {/* Optional Hide Keyboard button */}
        <TouchableOpacity
          onPress={Keyboard.dismiss}
          style={{ marginTop: 10 }}
        >
          <ThemedText style={{ color: "#4A90E2", textAlign: "center" }}>
            Hide Keyboard
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>
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
    top: 70,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  map: {
    flex: 1,
  },
  form: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,

    backgroundColor: "#ffffff",
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderRadius: 24,

    shadowColor: "#4A90E2",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F6FB",
    borderWidth: 1,
    borderColor: "#e0e7ff",
    fontSize: 15,
  },
  itemInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 18,
    paddingVertical: 10,
    justifyContent: "center",
    borderRadius: 20,
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
    backgroundColor: "#E8F1FF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 8,
  },
  itemText: {
    fontSize: 14,
    color: "#4A90E2",
  },
  removeButton: {
    fontSize: 16,
    color: "#4A90E2",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#4488d6",
    paddingVertical: 14,
    borderRadius: 22,
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
  error: {
    color: "red",
    marginTop: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 10,
    marginTop: 5,
    marginLeft: 3,
  },
  locationText: {
    marginBottom: 10,
    fontWeight: "600",
    color: "#1f2937",
  },
});