import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  View,
  Keyboard,
  Animated,
  Platform,
  Modal,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import MapView, { Marker } from "react-native-maps";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from "expo-router";

import ThemedView from "../../../components/ThemedView";
import ThemedText from "../../../components/ThemedText";
import Spacer from "../../../components/Spacer";
import { useMap } from "../../../hooks/useMap";
import { Ionicons } from "@expo/vector-icons";

import PlaceSearchInput from "./PlaceSearchInput";
import AppBackButton from "../../../components/AppBackButton"; 

const SelectDonationLocation = () => {
  const { saveDonationCenter } = useMap();
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [itemInput, setItemInput] = useState("");
  const [location, setLocation] = useState(null);
  const [placeName, setPlaceName] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!location || !placeName) {
      setError("Please type the address of the donation center.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be after start date.");
      return;
    }
    try {
      setLoading(true);
      await saveDonationCenter(items, {
        name: placeName,
        lat: location.latitude,
        lng: location.longitude,
        verified: false,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setItems([]);
      setItemInput("");
      setLocation(null);
      setPlaceName(null);
      setStartDate(new Date());
      setEndDate(new Date());
      alert("Donation center added!");
      
      // Redirect to map page
      router.push("/(dashboard)/map");
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

  const onStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      if (Platform.OS === 'ios') {
        setShowStartPicker(false);
      }
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
      if (Platform.OS === 'ios') {
        setShowEndPicker(false);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      
      <View style={styles.backButtonContainer}>
        <AppBackButton />
      </View>

      <View style={styles.searchOverlay}>
        <PlaceSearchInput
          onSelect={({ name, latitude, longitude }) => {
            setPlaceName(name);
            setLocation({ latitude, longitude });
          }}
          onFocus={(e) => { setIsInputFocused(true); handleFocus(e);}}
          onBlur={() => { setIsInputFocused(false); handleBlur();}}  
        />
          {isSearchFocused && (
              <TouchableOpacity
                onPress={Keyboard.dismiss}
                style={styles.hideKeyboardTopAbsolute}
              >
                <Ionicons name="chevron-down-outline" size={16} color="#4A90E2" /> 
                <ThemedText style={styles.hideKeyboardText}>
                  Hide Keyboard
                </ThemedText>
              </TouchableOpacity>
          )}
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
        {placeName && (
          <ThemedText style={styles.locationText}>📍 {placeName}</ThemedText>
        )}

        {/* Date Pickers */}
        <View style={styles.dateContainer}>
          <View style={styles.dateSection}>
            <ThemedText style={styles.label}>Start Date:</ThemedText>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#4A90E2" />
              <ThemedText style={styles.dateButtonText}>
                {formatDate(startDate)}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.dateSection}>
            <ThemedText style={styles.label}>End Date:</ThemedText>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#4A90E2" />
              <ThemedText style={styles.dateButtonText}>
                {formatDate(endDate)}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* iOS Modal Date Pickers */}
        {Platform.OS === 'ios' && showStartPicker && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showStartPicker}
            onRequestClose={() => setShowStartPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                    <ThemedText style={styles.modalButton}>Done</ThemedText>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  onChange={onStartDateChange}
                  minimumDate={new Date()}
                  textColor="#000"
                />
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'ios' && showEndPicker && (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showEndPicker}
            onRequestClose={() => setShowEndPicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                    <ThemedText style={styles.modalButton}>Done</ThemedText>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="spinner"
                  onChange={onEndDateChange}
                  minimumDate={startDate}
                  textColor="#000"
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Date Pickers */}
        {Platform.OS === 'android' && showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={onStartDateChange}
            minimumDate={new Date()}
          />
        )}

        {Platform.OS === 'android' && showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={onEndDateChange}
            minimumDate={startDate}
          />
        )}

        <Spacer height={8} />

        <ThemedText style={styles.label}>Items Accepted (Optional):</ThemedText>
        <Spacer height={4} />

        <View style={styles.itemInputWrapper}>
          <TextInput
            style={[styles.input, styles.itemInput]}
            placeholder="e.g., Crayons"
            value={itemInput}
            onChangeText={setItemInput}
            onSubmitEditing={handleAddItem}
            returnKeyType="done"
            onFocus={(e) => { setIsInputFocused(true); handleFocus(e);}}
            onBlur={() => { setIsInputFocused(false); handleBlur();}}  
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

        {(isInputFocused || isSearchFocused) && (
          <TouchableOpacity
            onPress={Keyboard.dismiss}
            style={styles.hideKeyboard}
          >
            <Ionicons name="chevron-down-outline" size={16} color="#4A90E2" /> 
            <ThemedText style={styles.hideKeyboardText}>
              Hide Keyboard
            </ThemedText>
          </TouchableOpacity>
        )}
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
  dateContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dateSection: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F6FB',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    marginTop: 6,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalButton: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
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
  hideKeyboard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 4,
  },
  hideKeyboardTopAbsolute: {
    position: "absolute",
    top: 50,
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 2000,  
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  hideKeyboardText: {
    color: "#4A90E2",
  },
  backButtonContainer: {
    position: "absolute",
    top: 150, 
    left: 16,
    zIndex: 2000,
  },
});