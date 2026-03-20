import {
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  View,
  TouchableWithoutFeedback,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import React, { useState } from "react";
import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import ThemedTextInput from "../../../components/ThemedTextInput";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useMatch } from "../../../hooks/useMatch";
import { Ionicons } from "@expo/vector-icons";

const ReceiveForm = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [itemSpecs, setItemSpecs] = useState({});
  const [otherItems, setOtherItems] = useState([]);
  const [otherInput, setOtherInput] = useState("");
  const [selectionMethod, setSelectionMethod] = useState(null);
  const [zipCode, setZipCode] = useState("");
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isZipFocused, setIsZipFocused] = useState(false);

  const { saveRequest } = useMatch();
  const router = useRouter();

  const supplyOptions = [
    "Backpacks",
    "Notebooks",
    "Pencils",
    "Pens",
    "Markers",
    "Crayons",
    "Binders",
    "Folders",
    "Tissues",
    "Hand Sanitizer",
  ];

  const allSelectedItems = [...selectedItems, ...otherItems];

  const toggleItem = (item) => {
    setSelectedItems((prev) => {
      if (prev.includes(item)) {
        const newQuantities = { ...quantities };
        const newSpecs = { ...itemSpecs };
        delete newQuantities[item];
        delete newSpecs[item];
        setQuantities(newQuantities);
        setItemSpecs(newSpecs);
        return prev.filter((i) => i !== item);
      } else {
        return [...prev, item];
      }
    });
  };

  const updateQuantity = (item, value) => {
    setQuantities({ ...quantities, [item]: value });
  };

  const updateSpec = (item, value) => {
    setItemSpecs({ ...itemSpecs, [item]: value });
  };

  const handleAddOtherItem = () => {
    if (otherInput.trim()) {
      const newItem = otherInput.trim();
      setOtherItems([...otherItems, newItem]);
      setOtherInput("");
    }
  };

  const handleRemoveOtherItem = (index) => {
    const item = otherItems[index];
    const newQuantities = { ...quantities };
    const newSpecs = { ...itemSpecs };
    delete newQuantities[item];
    delete newSpecs[item];
    setQuantities(newQuantities);
    setItemSpecs(newSpecs);
    setOtherItems(otherItems.filter((_, i) => i !== index));
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setError(null);
    } catch (err) {
      setError("Failed to get location.");
      console.log(err);
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError(null);

    if (selectedItems.length === 0 && otherItems.length === 0) {
      setError("Please select or add at least one supply item.");
      return;
    }

    if (!selectionMethod) {
      setError("Please choose a matching method: Zip Code or Location.");
      return;
    }

    let zipInt = null;
    if (selectionMethod === "zip") {
      if (zipCode.trim().length === 0) {
        setError("Please enter a zip code.");
        return;
      }
      zipInt = parseInt(zipCode.trim(), 10);
      if (isNaN(zipInt)) {
        setError("Zip code must be a valid number.");
        return;
      }
    }

    if (selectionMethod === "location" && !location) {
      setError("Please select your current location.");
      return;
    }

    const finalQuantities = {};
    allSelectedItems.forEach((item) => {
      const qty = parseInt(quantities[item], 10);
      finalQuantities[item] = isNaN(qty) || qty < 1 ? 1 : qty;
    });

    try {
      await saveRequest(
        selectedItems,
        otherItems,
        {
          zipCode: selectionMethod === "zip" ? zipInt : null,
          lat: selectionMethod === "location" ? location.latitude : null,
          lng: selectionMethod === "location" ? location.longitude : null,
        },
        finalQuantities,
        itemSpecs
      );

      setSelectedItems([]);
      setQuantities({});
      setItemSpecs({});
      setOtherItems([]);
      setOtherInput("");
      setZipCode("");
      setLocation(null);
      setSelectionMethod(null);

      Alert.alert(
        "Thank you!",
        "Thank you for your request!",
        [{ text: "OK", onPress: () => router.replace("/receive/requestlist") }],
        { cancelable: false }
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1, width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ ...styles.scrollContent, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <Spacer height={90} />
            <ThemedText title style={styles.heading}>
              Receive Form
            </ThemedText>

            <Spacer height={20} />

            {/* ── Supply grid ── */}
            <ThemedText>Select Supplies Needed:</ThemedText>
            <Spacer height={10} />
            <View style={styles.supplyContainer}>
              <View style={styles.column}>
                {supplyOptions.slice(0, 5).map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => toggleItem(item)}
                    style={[
                      styles.itemButton,
                      selectedItems.includes(item) && styles.itemSelected,
                    ]}
                  >
                    <ThemedText
                      style={
                        selectedItems.includes(item)
                          ? styles.itemTextSelected
                          : styles.itemText
                      }
                    >
                      {item}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.column}>
                {supplyOptions.slice(5).map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => toggleItem(item)}
                    style={[
                      styles.itemButton,
                      selectedItems.includes(item) && styles.itemSelected,
                    ]}
                  >
                    <ThemedText
                      style={
                        selectedItems.includes(item)
                          ? styles.itemTextSelected
                          : styles.itemText
                      }
                    >
                      {item}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Spacer height={15} />

            {/* ── Add other items ── */}
            <ThemedText>Add Other Items (Optional):</ThemedText>
            <Spacer height={10} />
            <View style={styles.otherInputWrapper}>
              <TextInput
                style={[styles.otherInput, { color: "#111" }]}
                placeholder="e.g., Glue sticks"
                value={otherInput}
                onChangeText={setOtherInput}
                onSubmitEditing={handleAddOtherItem}
                returnKeyType="done"
                placeholderTextColor="#999"
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAddOtherItem}>
                <ThemedText style={styles.addButtonText}>Add</ThemedText>
              </TouchableOpacity>
            </View>

            {isInputFocused && (
              <TouchableOpacity
                style={styles.hideKeyboardFloating}
                onPress={Keyboard.dismiss}
              >
                <Ionicons name="chevron-down-outline" size={16} color="#4A90E2" />
                <ThemedText style={styles.hideKeyboardText}>Hide Keyboard</ThemedText>
              </TouchableOpacity>
            )}

            {/* ── Selected items summary with qty + specs ── */}
            {allSelectedItems.length > 0 && (
              <>
                <Spacer height={20} />
                <ThemedText>Your Selected Items:</ThemedText>
                <Spacer height={8} />
                <View style={styles.selectedItemsContainer}>
                  {allSelectedItems.map((item) => {
                    const isOther = otherItems.includes(item);
                    return (
                      <View key={item} style={styles.selectedItemRow}>
                        {/* Item name + remove button */}
                        <View style={styles.selectedItemLeft}>
                          <TouchableOpacity
                            style={styles.removeChipButton}
                            onPress={() => {
                              if (isOther) {
                                handleRemoveOtherItem(otherItems.indexOf(item));
                              } else {
                                toggleItem(item);
                              }
                            }}
                          >
                            <ThemedText style={styles.removeChipText}>×</ThemedText>
                          </TouchableOpacity>
                          <View style={styles.selectedItemNameBox}>
                            <Text
                              style={styles.selectedItemName}
                              adjustsFontSizeToFit={!item.trim().includes(" ")}
                              numberOfLines={item.trim().includes(" ") ? undefined : 1}
                              minimumFontScale={0.5}
                            >
                              {item}
                            </Text>
                          </View>
                        </View>

                        {/* Qty input */}
                        <View style={styles.selectedItemQty}>
                          <ThemedText style={styles.qtyLabel}>Qty</ThemedText>
                          <TextInput
                            style={styles.qtyInput}
                            value={quantities[item] || ""}
                            onChangeText={(val) => updateQuantity(item, val)}
                            keyboardType="numeric"
                            placeholder="1"
                            placeholderTextColor="#aaa"
                            selectTextOnFocus
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                          />
                        </View>

                        {/* Specs input */}
                        <TextInput
                          style={styles.specInput}
                          value={itemSpecs[item] || ""}
                          onChangeText={(val) => updateSpec(item, val)}
                          placeholder="Specifications (optional)"
                          placeholderTextColor="#aaa"
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setIsInputFocused(false)}
                        />
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <Spacer height={20} />

            {/* ── Matching method ── */}
            <ThemedText>Choose Matching Method:</ThemedText>
            <Spacer height={10} />
            <View style={styles.radioContainer}>
              <TouchableOpacity
                style={[styles.radioButton, selectionMethod === "zip" && styles.radioSelected]}
                onPress={() => setSelectionMethod("zip")}
              >
                <ThemedText style={styles.radioText}>Zip Code</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.radioButton, selectionMethod === "location" && styles.radioSelected]}
                onPress={() => setSelectionMethod("location")}
              >
                <ThemedText style={styles.radioText}>Current Location</ThemedText>
              </TouchableOpacity>
            </View>

            <Spacer height={10} />

            {selectionMethod === "zip" && (
              <View style={{ width: "100%", alignItems: "center" }}>
                <ThemedTextInput
                  style={styles.input}
                  placeholder="Enter Zip Code"
                  value={zipCode}
                  onChangeText={setZipCode}
                  keyboardType="numeric"
                  onFocus={() => setIsZipFocused(true)}
                  onBlur={() => setIsZipFocused(false)}
                />
                {isZipFocused && (
                  <TouchableOpacity
                    style={styles.hideKeyboardFloating}
                    onPress={Keyboard.dismiss}
                  >
                    <Ionicons name="chevron-down-outline" size={16} color="#4A90E2" />
                    <ThemedText style={styles.hideKeyboardText}>Hide Keyboard</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {selectionMethod === "location" && (
              <TouchableOpacity style={styles.button} onPress={getLocation}>
                <ThemedText style={styles.buttonText}>
                  {location ? "Location Selected!" : "Use Current Location"}
                </ThemedText>
              </TouchableOpacity>
            )}

            {error && <ThemedText style={styles.error}>{error}</ThemedText>}

            <Spacer height={15} />

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <ThemedText style={styles.buttonText}>Submit Request</ThemedText>
            </TouchableOpacity>

            <Spacer height={20} />
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ThemedView>
  );
};

export default ReceiveForm;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#bcd7f5ff" },
  scrollContent: { padding: 20, alignItems: "center" },
  heading: { fontWeight: "bold", fontSize: 28, color: "#1F2A37", textAlign: "center" },

  supplyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "85%",
    gap: 10,
    marginTop: 10,
  },
  column: { flex: 1, gap: 10 },
  itemButton: {
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    alignItems: "center",
  },
  itemSelected: { backgroundColor: "#4A90E2", borderColor: "#4A90E2", shadowOpacity: 0.2 },
  itemText: { textAlign: "center", color: "#333", fontWeight: "500" },
  itemTextSelected: { textAlign: "center", color: "#fff", fontWeight: "bold" },

  otherInputWrapper: {
    flexDirection: "row",
    width: "90%",
    gap: 10,
    marginTop: 10,
    marginBottom: 15,
  },
  otherInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  addButton: {
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "600" },

  selectedItemsContainer: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  selectedItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 8,
  },
  selectedItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedItemNameBox: {
    width: 80,
  },
  selectedItemName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  removeChipButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF6B6B",
    justifyContent: "center",
    alignItems: "center",
  },
  removeChipText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 18,
  },
  selectedItemQty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  qtyLabel: {
    fontSize: 11,
    color: "#888",
  },
  qtyInput: {
    width: 38,
    height: 30,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    textAlign: "center",
    backgroundColor: "#f9f9f9",
    color: "#000",
    fontSize: 13,
  },
  specInput: {
    flex: 1.4,
    height: 30,
    borderWidth: 1,
    borderColor: "#dde",
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f9f9f9",
    fontSize: 10,
    color: "#333",
    minWidth: 0,
  },

  radioContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 10,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    marginHorizontal: 5,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  radioSelected: { backgroundColor: "#4A90E2", borderColor: "#4A90E2" },
  radioText: { color: "#333", fontWeight: "600" },
  button: {
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginVertical: 15,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 18, textAlign: "center" },
  error: { color: "red", fontSize: 14, marginBottom: 10, marginTop: 5 },
  input: {
    width: "90%",
    backgroundColor: "#e9f0f9",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  hideKeyboardFloating: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    gap: 4,
  },
  hideKeyboardText: {
    color: "#4A90E2",
    fontWeight: "500",
  },
});