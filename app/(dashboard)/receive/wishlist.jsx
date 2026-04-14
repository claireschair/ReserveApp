import { StyleSheet, TextInput, TouchableOpacity, View, Keyboard, Alert, KeyboardAvoidingView, Platform, ScrollView, } from 'react-native';
import { useState, useEffect, useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';

import Spacer from "../../../components/Spacer";
import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import { useWishlist } from "../../../hooks/useWishlist";
import { UserContext } from '../../../contexts/UserContext';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

const isAmazonLink = (url) => {
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname.includes("amazon.");
  } catch {
    return false;
  }
};

const Wishlist = () => {
  const [name, setName] = useState("");
  const [amazon, setAmazon] = useState("");
  const [items, setItems] = useState([]);
  const [itemInput, setItemInput] = useState("");
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isTeacher, setIsTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const { saveWishlist, existingWishlist } = useWishlist();
  const { user } = useContext(UserContext);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setIsTeacher(user.label === "teacher");
    setLoading(false);
  }, [user]);

  // Pre-fill form if wishlist already exists
  useEffect(() => {
    if (existingWishlist) {
      setName(existingWishlist.name || "");
      setAmazon(existingWishlist.amazonLink || "");
      setItems(existingWishlist.items || []);
    }
  }, [existingWishlist]);

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

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!amazon.trim()) {
      setError("Please enter your Amazon wishlist link.");
      return;
    }

    if (!isAmazonLink(amazon)) {
      setError("Please enter a valid Amazon link (must be from amazon.com).");
      return;
    }

    try {
      await saveWishlist(name, amazon, items);
      setItemInput("");
      Alert.alert(
        "Success",
        existingWishlist ? "Your wishlist has been updated!" : "Thank you for submitting your wishlist!"
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
  };

  return (
    <ThemedView style={styles.container}>
    <KeyboardAvoidingView
          style={{ flex: 1, width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}            
    >
      <ScrollView  contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Spacer height={110} />
      <View style={styles.headerCard}>
        <ThemedText style={styles.heading}>
          {existingWishlist ? "Edit Your Wishlist" : "Add To Your Wishlist"}
        </ThemedText>
        <Spacer height={2} />
        <ThemedText style={styles.subtitle}>
          Share classroom needs with supporters
        </ThemedText>
      </View>

      <Spacer height={10} />

      {loading ? (
        <View style={styles.centerContent}>
          <ThemedText>Loading...</ThemedText>
        </View>
      ) : !user ? (
        <View style={styles.centerContent}>
          <ThemedText style={styles.warningText}>
            Please log in to create a wishlist.
          </ThemedText>
        </View>
      ) : !isTeacher ? (
        <View style={styles.centerContent}>
          <View style={styles.emptyState}>
            <Ionicons name="lock-closed-outline" size={40} color="#999" />
            <Spacer height={12} />
            <ThemedText style={styles.warningText}>
              Only teachers can create wishlists.
            </ThemedText>
          </View>
          <Spacer height={10} />
          <ThemedText style={styles.subtleText}>
            If you are a teacher, please contact support to update your account.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.formWrapper}>
          <ThemedText style={styles.label}>Name</ThemedText>
          <Spacer height={8} />
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />

          <Spacer height={20} />

          <ThemedText style={styles.label}>Amazon Wishlist Link</ThemedText>
          <Spacer height={8} />
          <TextInput
            style={[styles.input, amazon && !isAmazonLink(amazon) && styles.inputError]}
            placeholder="https://www.amazon.com/..."
            value={amazon}
            onChangeText={setAmazon}
            keyboardType="url"
            autoCapitalize="none"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {amazon && !isAmazonLink(amazon) && (
            <ThemedText style={styles.inlineError}>
              ⚠️ This doesn't look like an Amazon link
            </ThemedText>
          )}

          <Spacer height={20} />

          <ThemedText style={styles.label}>Specific Items (Optional)</ThemedText>
          <Spacer height={8} />

          <View style={styles.itemInputWrapper}>
            <TextInput
              style={[styles.input, styles.itemInput]}
              placeholder="e.g., Desk organizer"
              value={itemInput}
              onChangeText={setItemInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onSubmitEditing={handleAddItem}
              returnKeyType="done"
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

          {isFocused && (
            <View style={styles.keyboardButtonWrapper}>
              <TouchableOpacity style={styles.keyboardButton} onPress={Keyboard.dismiss}>
                <Ionicons name="chevron-down-outline" size={16} color="#4A90E2" /> 
                <ThemedText style={styles.keyboardButtonText}>Hide Keyboard</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <Spacer height={15} />

          {error && (
            <>
              <ThemedText style={styles.error}>{error}</ThemedText>
              <Spacer height={10} />
            </>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <ThemedText style={styles.buttonText}>
              {existingWishlist ? "Update Wishlist  " : "Submit Wishlist"}
              <FontAwesome5 name="pencil-alt" size={18} color="#ffffff" />
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <Spacer />
      </ScrollView>
    </KeyboardAvoidingView>
    </ThemedView>
  );
};

export default Wishlist;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#ebf0ff",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scrollContent: { padding: 0},
  emptyState: {
    alignItems: "center",
  },
  warningText: {
    fontSize: 16,
    textAlign: "center",
    color: "#d32f2f",
    fontWeight: "600",
  },
  subtleText: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
  },
  headerCard: {
    backgroundColor: "#699cea",
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignSelf: "center",
    marginBottom: 35,
    shadowColor: "#4F7BFF",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    color: "#f0f4ff",
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#e2f0ff",
    lineHeight: 22,
  },
  formWrapper: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#e4ebf597",
    borderWidth: 0,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: "#111",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#d32f2f",
  },
  inlineError: {
    color: "#d32f2f",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  itemInputWrapper: {
    flexDirection: "row",
    gap: 10,
  },
  itemInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: "#519ae9",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 8,
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
    backgroundColor: "#EEF4FF",
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  itemText: {
    fontSize: 14,
    color: "#007AFF",
  },
  removeButton: {
    fontSize: 16,
    fontWeight: "bold",
    paddingLeft: 4,
  },
  keyboardButtonWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 4,
  },
  keyboardButton: {
    //position: "absolute",
    left: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 2000,  
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },
  keyboardButtonText: {
    color: "#4A90E2",
  },
  error: {
    color: "#d32f2f",
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#448bd6",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#4F7BFF",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});