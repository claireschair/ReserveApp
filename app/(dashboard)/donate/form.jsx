import { StyleSheet, TouchableOpacity, Keyboard, ScrollView, View, TouchableWithoutFeedback, Alert, TextInput } from "react-native";
import React, { useState } from "react";
import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import ThemedTextInput from "../../../components/ThemedTextInput";
import { useMatch } from "../../../hooks/useMatch";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

const DonationForm = () => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [otherItems, setOtherItems] = useState([]);
  const [otherInput, setOtherInput] = useState("");
  const [selectionMethod, setSelectionMethod] = useState(null);
  const [zipCode, setZipCode] = useState("");
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  const { saveDonation } = useMatch();
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
  ];

  const toggleItem = (item) => {
    setSelectedItems((prev) => {
      if (prev.includes(item)) {
        const newQuantities = { ...quantities };
        delete newQuantities[item];
        setQuantities(newQuantities);
        return prev.filter((i) => i !== item);
      } else {
        // Don't set any default - leave it empty so user can type freely
        return [...prev, item];
      }
    });
  };

  const updateQuantity = (item, value) => {
    // Store whatever the user types - no validation while typing
    setQuantities({ ...quantities, [item]: value });
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
    delete newQuantities[item];
    setQuantities(newQuantities);
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

    if (selectionMethod === "location") {
      if (!location) {
        setError("Please select your current location.");
        return;
      }
    }

    // Validate and clean quantities ONLY on submit
    const finalQuantities = {};
    [...selectedItems, ...otherItems].forEach(item => {
      const qty = parseInt(quantities[item], 10);
      // If blank/invalid/0, default to 1. Otherwise use the value.
      finalQuantities[item] = (isNaN(qty) || qty < 1) ? 1 : qty;
    });

    try {
      await saveDonation(
        selectedItems,
        otherItems,
        {
          zipCode: selectionMethod === "zip" ? zipInt : null,
          lat: selectionMethod === "location" ? location.latitude : null,
          lng: selectionMethod === "location" ? location.longitude : null,
        },
        finalQuantities
      );

      setSelectedItems([]);
      setQuantities({});
      setOtherItems([]);
      setOtherInput("");
      setZipCode("");
      setLocation(null);
      setSelectionMethod(null);

      Alert.alert(
        "Thank you!",
        "Thank you for your donation!",
        [
          {
            text: "OK",
            onPress: () => router.replace("/donate/donationlist"),
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Spacer height={90} />
          <ThemedText title style={styles.heading}>
            Donation Form
          </ThemedText>

          <Spacer height={20} />

          <ThemedText>Select Supplies to Donate:</ThemedText>
          <Spacer height={10} />

          <View style={styles.supplyContainer}>
            <View style={styles.column}>
              {supplyOptions.slice(0, 4).map((item) => (
                <View key={item}>
                  <TouchableOpacity
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
                  {selectedItems.includes(item) && (
                    <View style={styles.quantityContainer}>
                      <ThemedText style={styles.quantityLabel}>Qty:</ThemedText>
                      <TextInput
                        style={styles.quantityInput}
                        value={quantities[item] || ""}
                        onChangeText={(val) => updateQuantity(item, val)}
                        keyboardType="numeric"
                        placeholder="1"
                        selectTextOnFocus={true}
                        placeholderTextColor="#999"
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={styles.column}>
              {supplyOptions.slice(4).map((item) => (
                <View key={item}>
                  <TouchableOpacity
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
                  {selectedItems.includes(item) && (
                    <View style={styles.quantityContainer}>
                      <ThemedText style={styles.quantityLabel}>Qty:</ThemedText>
                      <TextInput
                        style={styles.quantityInput}
                        value={quantities[item] || ""}
                        onChangeText={(val) => updateQuantity(item, val)}
                        keyboardType="numeric"
                        placeholder="1"
                        selectTextOnFocus={true}
                        placeholderTextColor="#999"
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          <Spacer height={15} />

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
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddOtherItem}>
              <ThemedText style={styles.addButtonText}>Add</ThemedText>
            </TouchableOpacity>
          </View>

          {otherItems.length > 0 && (
            <View style={styles.otherItemsList}>
              {otherItems.map((item, index) => (
                <View key={index} style={styles.otherItemChip}>
                  <ThemedText style={styles.otherItemText}>{item}</ThemedText>
                  <View style={styles.quantityMini}>
                    <ThemedText style={styles.quantityMiniLabel}>Qty:</ThemedText>
                    <TextInput
                      style={styles.quantityMiniInput}
                      value={quantities[item] || ""}
                      onChangeText={(val) => updateQuantity(item, val)}
                      keyboardType="numeric"
                      selectTextOnFocus={true}
                      placeholderTextColor="#999"
                    />
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveOtherItem(index)}>
                    <ThemedText style={styles.removeButton}>X</ThemedText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Spacer height={20} />
          <ThemedText>Choose Matching Method:</ThemedText>
          <Spacer height={10} />

          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                selectionMethod === "zip" && styles.radioSelected,
              ]}
              onPress={() => setSelectionMethod("zip")}
            >
              <ThemedText style={styles.radioText}>Zip Code</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioButton,
                selectionMethod === "location" && styles.radioSelected,
              ]}
              onPress={() => setSelectionMethod("location")}
            >
              <ThemedText style={styles.radioText}>Current Location</ThemedText>
            </TouchableOpacity>
          </View>

          <Spacer height={10} />

          {selectionMethod === "zip" && (
            <ThemedTextInput
              style={styles.input}
              placeholder="Enter Zip Code"
              value={zipCode}
              onChangeText={setZipCode}
              keyboardType="numeric"
            />
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
            <ThemedText style={styles.buttonText}>Submit Donation</ThemedText>
          </TouchableOpacity>

          <Spacer height={20} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </ThemedView>
  );
};

export default DonationForm;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#bcd7f5ff',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 28,
    color: '#1F2A37',
    textAlign: 'center',
  },
  supplyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '85%',
    gap: 10,
    marginTop: 10,
  },
  column: {
    flex: 1,
    gap: 10,
  },
  itemButton: {
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    alignItems: 'center',
  },
  itemSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
    shadowOpacity: 0.2,
  },
  itemText: {
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  itemTextSelected: {
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    gap: 5,
  },
  quantityLabel: {
    fontSize: 12,
    color: '#666',
  },
  quantityInput: {
    width: 50,
    height: 30,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    textAlign: 'center',
    backgroundColor: '#fff',
    color: '#000',
  },
  otherInputWrapper: {
    flexDirection: 'row',
    width: '90%',
    gap: 10,
    marginTop: 10,
  },
  otherInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  otherItemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    width: '90%',
  },
  otherItemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCEEFF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 8,
  },
  otherItemText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  quantityMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  quantityMiniLabel: {
    fontSize: 11,
    color: '#4A90E2',
  },
  quantityMiniInput: {
    width: 35,
    height: 22,
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderRadius: 5,
    textAlign: 'center',
    backgroundColor: '#fff',
    fontSize: 11,
    color: '#000',
  },
  removeButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 10,
  },
  radioButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  radioSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  radioText: {
    color: '#333',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 25,
    borderRadius: 30,
    marginVertical: 15,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  error: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    marginTop: 5,
  },
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
});