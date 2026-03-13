import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
} from "react-native";
import ThemedText from "../../../components/ThemedText";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const PlaceSearchInput = ({ onSelect, onFocus, onBlur }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const searchPlaces = async (text) => {
    setQuery(text);

    if (text.length < 3) {
      setResults([]);
      return;
    }

    // Build viewbox parameter for proximity-based results if user location is available
    const viewbox = userLocation
      ? `&viewbox=${userLocation.longitude - 0.5},${userLocation.latitude + 0.5},${userLocation.longitude + 0.5},${userLocation.latitude - 0.5}&bounded=0`
      : "";

    try {
      // OpenStreetMap Nominatim API
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(text)}` +
        `&format=json` +
        `&addressdetails=1` +
        `&limit=5` +
        `${viewbox}` +
        //'kumrnidhi@gmail.com', // Replace with contact email
        {
          headers: {
            "User-Agent": "Reserve (kumrnidhi@gmail.com)" 
          }
        }
      );

      const data = await res.json();
      setResults(data || []);
    } catch (err) {
      console.log("Autocomplete error", err);
    }
  };

  // Helper function to get a clean display name
  const getDisplayName = (item) => {
    return item.display_name || item.name || "Unnamed location";
  };

  // Helper function to get a short name for selection
  const getShortName = (item) => {
    if (item.name) return item.name;
    if (item.address?.amenity) return item.address.amenity;
    if (item.address?.shop) return item.address.shop;
    if (item.display_name) return item.display_name.split(',')[0];
    return "Unnamed location";
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#6B7280" />

        <TextInput
          style={styles.input}
          placeholder="Search for a place or address"
          value={query}
          onChangeText={searchPlaces}
          placeholderTextColor="#9CA3AF"
          onFocus={() => onFocus && onFocus()}
          onBlur={() => onBlur && onBlur()}
        />
      </View>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.place_id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.result}
                onPress={() => {
                  const displayName = getDisplayName(item);

                   Keyboard.dismiss();
                  setQuery(displayName);
                  setResults([]);
                  onSelect({
                    name: getShortName(item),
                    latitude: parseFloat(item.lat),
                    longitude: parseFloat(item.lon),
                    fullAddress: displayName,
                  });
                }}
              >
                <ThemedText>{getDisplayName(item)}</ThemedText>
                {item.type && (
                  <ThemedText style={styles.typeText}>
                    {item.type}
                  </ThemedText>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

export default PlaceSearchInput;

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    zIndex: 1000,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#111",
  },
  resultsContainer: {
    position: "absolute",
    top: 50,
    width: "100%",
    backgroundColor: "white",
    borderRadius: 10,
    maxHeight: 200,
    zIndex: 1001,
    elevation: Platform.OS === "android" ? 10 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  result: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  typeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 46,

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});