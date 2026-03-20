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
import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";

const PlaceSearchInput = ({ onSelect, onFocus, onBlur }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef(null);

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

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  const performSearch = async (text) => {
    if (text.length < 3) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=10`;

      // Add location bias if available
      if (userLocation) {
        url += `&lat=${userLocation.latitude}&lon=${userLocation.longitude}&bounded=1&viewbox=${userLocation.longitude - 0.1},${userLocation.latitude + 0.1},${userLocation.longitude + 0.1},${userLocation.latitude - 0.1}`;
      }

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Reserve (kumrnidhi@gmail.com)"
        }
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.log("Rate limited - please wait a moment before searching again");
          setIsSearching(false);
          return;
        }
        console.log("Search failed with status:", res.status);
        setIsSearching(false);
        return;
      }

      const data = await res.json();
      
      // Sort results by distance from user if location is available
      if (userLocation && data.length > 0) {
        data.sort((a, b) => {
          const distA = getDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(a.lat),
            parseFloat(a.lon)
          );
          const distB = getDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(b.lat),
            parseFloat(b.lon)
          );
          return distA - distB;
        });
      }

      // Limit to top 5 after sorting
      setResults(data.slice(0, 5) || []);
      setIsSearching(false);
    } catch (err) {
      console.log("Autocomplete error:", err);
      setIsSearching(false);
    }
  };

  const searchPlaces = (text) => {
    setQuery(text);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer - wait 800ms after user stops typing
    debounceTimer.current = setTimeout(() => {
      performSearch(text);
    }, 800);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Helper function to get a clean display name
  const getDisplayName = (item) => {
    return item.display_name || item.name || "Unnamed location";
  };

  // Helper function to get a short name for selection
  const getShortName = (item) => {
    if (item.name) return item.name;
    if (item.address?.amenity) return item.address.amenity;
    if (item.address?.shop) return item.address.shop;
    if (item.address?.building) return item.address.building;
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
        
        {isSearching && (
          <Ionicons name="hourglass-outline" size={18} color="#4A90E2" />
        )}
        
        {query.length > 0 && !isSearching && (
          <TouchableOpacity onPress={() => {
            setQuery("");
            setResults([]);
            if (debounceTimer.current) {
              clearTimeout(debounceTimer.current);
            }
          }}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
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
                <View style={styles.resultContent}>
                  <Ionicons 
                    name={item.type === 'amenity' ? 'location' : 'navigate-outline'} 
                    size={16} 
                    color="#4A90E2" 
                  />
                  <View style={styles.resultTextContainer}>
                    <ThemedText style={styles.resultTitle}>
                      {getShortName(item)}
                    </ThemedText>
                    <ThemedText style={styles.resultAddress}>
                      {getDisplayName(item)}
                    </ThemedText>
                  </View>
                </View>
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
    maxHeight: 250,
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
  resultContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 12,
    color: "#666",
  },
  typeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});