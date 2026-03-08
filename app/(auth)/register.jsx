import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, TouchableOpacity, View, ScrollView } from 'react-native'
import { Link } from 'expo-router'
import { useState, useRef } from 'react'
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
  const [isAdult, setIsAdult] = useState(false)
  const [school, setSchool] = useState("")
  const [schoolResults, setSchoolResults] = useState([])
  const [schoolSearching, setSchoolSearching] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState(null)
  const searchTimeout = useRef(null)
  const [selectedState, setSelectedState] = useState("")
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false)

  const US_STATES = [
    { label: "Alabama", value: "AL" }, { label: "Alaska", value: "AK" },
    { label: "Arizona", value: "AZ" }, { label: "Arkansas", value: "AR" },
    { label: "California", value: "CA" }, { label: "Colorado", value: "CO" },
    { label: "Connecticut", value: "CT" }, { label: "Delaware", value: "DE" },
    { label: "Florida", value: "FL" }, { label: "Georgia", value: "GA" },
    { label: "Hawaii", value: "HI" }, { label: "Idaho", value: "ID" },
    { label: "Illinois", value: "IL" }, { label: "Indiana", value: "IN" },
    { label: "Iowa", value: "IA" }, { label: "Kansas", value: "KS" },
    { label: "Kentucky", value: "KY" }, { label: "Louisiana", value: "LA" },
    { label: "Maine", value: "ME" }, { label: "Maryland", value: "MD" },
    { label: "Massachusetts", value: "MA" }, { label: "Michigan", value: "MI" },
    { label: "Minnesota", value: "MN" }, { label: "Mississippi", value: "MS" },
    { label: "Missouri", value: "MO" }, { label: "Montana", value: "MT" },
    { label: "Nebraska", value: "NE" }, { label: "Nevada", value: "NV" },
    { label: "New Hampshire", value: "NH" }, { label: "New Jersey", value: "NJ" },
    { label: "New Mexico", value: "NM" }, { label: "New York", value: "NY" },
    { label: "North Carolina", value: "NC" }, { label: "North Dakota", value: "ND" },
    { label: "Ohio", value: "OH" }, { label: "Oklahoma", value: "OK" },
    { label: "Oregon", value: "OR" }, { label: "Pennsylvania", value: "PA" },
    { label: "Rhode Island", value: "RI" }, { label: "South Carolina", value: "SC" },
    { label: "South Dakota", value: "SD" }, { label: "Tennessee", value: "TN" },
    { label: "Texas", value: "TX" }, { label: "Utah", value: "UT" },
    { label: "Vermont", value: "VT" }, { label: "Virginia", value: "VA" },
    { label: "Washington", value: "WA" }, { label: "West Virginia", value: "WV" },
    { label: "Wisconsin", value: "WI" }, { label: "Wyoming", value: "WY" },
  ];

  const { register } = useUser()

  const searchSchools = async (text) => {
    setSchool(text)
    setSelectedSchool(null)
    setSchoolResults([])

    if (text.length < 3) {
      setSchoolSearching(false)
      return
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    setSchoolSearching(true)

    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}+school+${selectedState}&format=json&addressdetails=1&limit=8&countrycodes=us`,
          {
            headers: {
              'User-Agent': 'Reserve'
            }
          }
        )
        const data = await res.json()
        console.log("Results:", JSON.stringify(data[0]))
        setSchoolResults(data || [])
      } catch (err) {
        console.error("School search error:", err)
      } finally {
        setSchoolSearching(false)
      }
    }, 500)
  }
  const handleSelectSchool = (s) => {
    setSelectedSchool(s)
    setSchool(s.name || s.display_name.split(",")[0])
    setSchoolResults([])
  }

  const handleSubmit = async () => {
    setError(null)

    if (!name.trim()) {
      setError("Please enter your name.")
      return
    }

    if (!label) {
      setError("Please select your role (Teacher/Parent)")
      return
    }

    if (!selectedSchool) {
      setError("Please search for and select your school")
      return
    }

    if (!isAdult) {
      setError("You must be 18 or older to use this service")
      return
    }

    try {
      await register(email, password, name, label.toLowerCase(), {
        schoolName: selectedSchool.name || selectedSchool.display_name.split(",")[0],
        schoolId: selectedSchool.place_id,
        city: selectedSchool.address?.city || selectedSchool.address?.town || "",
        state: selectedSchool.address?.state || selectedState,
      })
    } catch (error) {
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
        setSchoolResults([])
      }}
    >
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>

            <Spacer />
            <ThemedText title style={styles.title}>
              Create Your Account
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Join Reserve Today ✨
            </ThemedText>
            <Spacer />
            {/* NAME */}
            <ThemedTextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />

            {/* ROLE DROPDOWN */}
            <View style={[styles.dropdownContainer, { zIndex: 2000 }]}>
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
            {/* STATE DROPDOWN */}
            <View style={[styles.dropdownContainer, { zIndex: 1500 }]}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => {
                  setStateDropdownOpen(!stateDropdownOpen)
                  setDropdownOpen(false)
                }}
              >
                <ThemedText style={selectedState ? styles.selectedText : styles.placeholderText}>
                  {selectedState ? US_STATES.find(s => s.value === selectedState)?.label : "Select State"}
                </ThemedText>
                <ThemedText style={styles.arrow}>▼</ThemedText>
              </TouchableOpacity>

              {stateDropdownOpen && (
                <ScrollView style={styles.stateDropdownMenu} nestedScrollEnabled>
                  {US_STATES.map((s) => (
                    <TouchableOpacity
                      key={s.value}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedState(s.value)
                        setStateDropdownOpen(false)
                        setSchool("")
                        setSchoolResults([])
                        setSelectedSchool(null)
                      }}
                    >
                      <ThemedText style={selectedState === s.value && styles.selectedOptionText}>
                        {s.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            {/* SCHOOL SEARCH */}
            <View style={[styles.dropdownContainer, { zIndex: 1000 }]}>
              <ThemedTextInput
                style={[
                  styles.input,
                  { width: "100%", marginBottom: 0 },
                  selectedSchool && styles.inputSuccess
                ]}
                placeholder="Search your affiliated school"
                value={school}
                onChangeText={searchSchools}
              />

              {schoolSearching && (
                <ThemedText style={styles.searchingText}>Searching...</ThemedText>
              )}

              {!schoolSearching && schoolResults.length > 0 && (
                <View style={styles.schoolDropdownMenu}>
                  {schoolResults.map((s) => (
                    <TouchableOpacity
                      key={s.place_id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectSchool(s)}
                    >
                      <ThemedText style={styles.schoolName}>
                        {s.name || s.display_name.split(",")[0]}
                      </ThemedText>
                      <ThemedText style={styles.schoolLocation}>
                        {s.address?.city || s.address?.town || s.address?.county}, {s.address?.state}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Spacer height={5}/>

            {/* EMAIL */}
            <ThemedTextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            {/* PASSWORD */}
            <ThemedTextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* AGE CHECKBOX */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsAdult(!isAdult)}
            >
              <View style={[styles.checkbox, isAdult && styles.checkboxChecked]}>
                {isAdult && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <ThemedText style={styles.checkboxLabel}>
                I am 18 years of age or older
              </ThemedText>
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

            <Spacer />
          </View>
        </ScrollView>
      </ThemedView>
    </TouchableWithoutFeedback>
  )
}

export default Register

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#bcd7f5ff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
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
  inputSuccess: {
    borderColor: "#4A90E2",
    borderWidth: 2,
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
    elevation: 10,
  },
  schoolDropdownMenu: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e7ff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 1001,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4ff",
  },
  selectedOptionText: {
    fontWeight: "600",
    color: "#4A90E2",
  },
  searchingText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 6,
    marginLeft: 4,
  },
  schoolName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  schoolLocation: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
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
  stateDropdownMenu: {
    position: "absolute",
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e7ff",
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 15,
  },
})