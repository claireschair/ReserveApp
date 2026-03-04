import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, TouchableOpacity, View } from 'react-native'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Colors } from '../../constants/Colors'

import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'
import Spacer from '../../components/Spacer'
import ThemedButton from '../../components/ThemedButton'
import ThemedTextInput from "../../components/ThemedTextInput"
import { useUser } from '../../hooks/useUser'

const LABEL_OPTIONS = ['Teacher', 'Parent'];

const Register = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState()
  const [label, setLabel] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isAdult, setIsAdult] = useState("")
  const {register} = useUser()

  const handleSubmit = async () => {
    setError(null)
    
    if (!label) {
      setError("Please select your role (Teacher/Parent)")
      return
    }
    if (!isAdult) {
      setError("You must be 18 or older to use this service")
    return
  }
    
    try {
      await register(email, password, name, label.toLowerCase())
    } catch(error) {
      setError(error.message)
    }
  }

  const handleSelectLabel = (selectedLabel) => {
    setLabel(selectedLabel)
    setDropdownOpen(false)
  }

  return (
<TouchableWithoutFeedback
  onPress={() => {
    Keyboard.dismiss()
    setDropdownOpen(false)
  }}
>
  <ThemedView style={styles.container}>
    <View style={styles.card}>

      <Spacer />
      <ThemedText title style={styles.title}>
        Create Your Account
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        Join Reserve today ✨
      </ThemedText>

      <Spacer />

      <ThemedTextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />

      {/* ROLE DROPDOWN */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setDropdownOpen(!dropdownOpen)}
        >
          <ThemedText style={label ? styles.selectedText : styles.placeholderText}>
            {label || "Select Role"}
          </ThemedText>
          <ThemedText style={styles.arrow}>▼</ThemedText>
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {LABEL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownItem}
                onPress={() => handleSelectLabel(option)}
              >
                <ThemedText style={label === option && styles.selectedOptionText}>
                  {option}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      

      <ThemedTextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <ThemedTextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity 
        style={styles.checkboxRow} 
        onPress={() => setIsAdult(!isAdult)}
      >
        <View style={[styles.checkbox, isAdult && styles.checkboxChecked]}>
          {isAdult && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <ThemedText style={styles.checkboxLabel}>I am 18 years of age or older</ThemedText>
      </TouchableOpacity>

      <ThemedButton onPress={handleSubmit} style={styles.registerButton}>
        <Text style={{ color: "#f2f2f2" }}>Register</Text>
      </ThemedButton>

      <Spacer />

      {error && <Text style={styles.error}>{error}</Text>}

      <Spacer height={40} />

      <Link href="/login" replace>
        <ThemedText style={{ textAlign: "center" }}>
          Login instead
        </ThemedText>
      </Link>

    </View>
  </ThemedView>
</TouchableWithoutFeedback>
  )
}

export default Register

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#bcd7f5ff"
  },

  card: {
    backgroundColor: "#ffffff",
    width: "85%",
    paddingVertical: 40,
    paddingHorizontal: 25,
    borderRadius: 30,
    alignItems: "center",

    shadowColor: "#4A90E2",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  title: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "600",
    marginBottom: 10,
    color: "#1f2937"
  },

  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 25,
  },

  input: {
    width: "90%",
    backgroundColor: "#F3F6FB",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },

  registerButton: {
    width: "40%",
    backgroundColor: "#4A90E2",
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
  },

  error: {
    color: Colors.warning,
    padding: 10,
    backgroundColor: "#f5c1c8",
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 10,
    width: "90%",
    textAlign: "center",
  },

  dropdownContainer: {
    width: "90%",
    marginBottom: 18,
    zIndex: 1000,
  },

  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    borderWidth: 1,
    borderColor: "#e0e7ff",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },

  placeholderText: {
    color: "#9CA3AF",
  },

  selectedText: {
    color: "#111827",
  },

  arrow: {
    fontSize: 12,
    color: "#6B7280",
  },

  dropdownMenu: {
    position: "absolute",
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e7ff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },

  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },

  selectedOptionText: {
    fontWeight: "600",
    color: "#4A90E2",
  },
  checkboxRow: {
  flexDirection: "row",
  alignItems: "center",
  width: "90%",
  marginBottom: 18,
},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#e0e7ff",
    backgroundColor: "#F3F6FB",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#4A90E2",
    borderColor: "#4A90E2",
  },
  checkmark: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
});
