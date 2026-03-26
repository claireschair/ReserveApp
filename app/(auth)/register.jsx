import { Keyboard, StyleSheet, Text, TouchableWithoutFeedback, TouchableOpacity, View, ScrollView } from 'react-native'
import { Link, useRouter } from 'expo-router'
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
  const [isCustomSchool, setIsCustomSchool] = useState(false)
  const [customSchool, setCustomSchool] = useState("")
  const searchTimeout = useRef(null)
  const [selectedState, setSelectedState] = useState("")
  const router = useRouter()

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
          { headers: { 'User-Agent': 'Reserve' } }
        )
        const data = await res.json()
        setSchoolResults(data || [])
      } catch (error) {
        console.error("School search error:", error)
      } finally {
        setSchoolSearching(false)
      }
    }, 500)
  }

  const handleSelectSchool = (s) => {
    setSelectedSchool(s)
    setSchool(s.name || s.display_name.split(",")[0])
    setSchoolResults([])
    setIsCustomSchool(false)
  }

  const handleSelectOther = () => {
    setSchoolResults([])
    setIsCustomSchool(true)
    setSchool("")
    setSelectedSchool(null)
  }

  const handleCustomSchoolChange = (text) => {
    setCustomSchool(text)
    if (text.trim()) {
      setSelectedSchool({ name: text, place_id: "custom", isCustom: true })
    } else {
      setSelectedSchool(null)
    }
  }

  const handleBackToSearch = () => {
    setIsCustomSchool(false)
    setCustomSchool("")
    setSelectedSchool(null)
    setSchool("")
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
        schoolName: selectedSchool.isCustom
          ? selectedSchool.name
          : selectedSchool.name || selectedSchool.display_name.split(",")[0],
        schoolId: selectedSchool.place_id,
        city: selectedSchool.isCustom ? "" : selectedSchool.address?.city || selectedSchool.address?.town || "",
        state: selectedSchool.isCustom ? "" : selectedSchool.address?.state || selectedState,
      })
      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email, password },
      })
    } catch (error) {
      setError(error.message)
    }
  }

  const handleSelectLabel = (selectedLabel) => {
    setLabel(selectedLabel)
    setDropdownOpen(false)
  }

  const showOtherLink = !schoolSearching && school.length >= 3 && schoolResults.length === 0
  const showOtherInDropdown = !schoolSearching && schoolResults.length > 0

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

            <Spacer height={10} />

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

            {/* SCHOOL SEARCH */}
            <View style={[styles.dropdownContainer, { zIndex: 1000 }]}>
              {isCustomSchool ? (
                // Custom school input
                <View>
                  <ThemedTextInput
                    style={[
                      styles.input,
                      { width: "100%", marginBottom: 6 },
                      customSchool.trim() && styles.inputSuccess,
                    ]}
                    placeholder="Enter your school name"
                    value={customSchool}
                    onChangeText={handleCustomSchoolChange}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleBackToSearch} style={styles.otherLink}>
                    <ThemedText style={styles.otherLinkText}>← Back to search</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                // School search input + results
                <>
                  <ThemedTextInput
                    style={[
                      styles.input,
                      { width: "100%", marginBottom: 0 },
                      selectedSchool && styles.inputSuccess,
                    ]}
                    placeholder="Search your affiliated school"
                    value={school}
                    onChangeText={searchSchools}
                  />

                  {schoolSearching && (
                    <ThemedText style={styles.searchingText}>Searching...</ThemedText>
                  )}

                  {showOtherInDropdown && (
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

                      {/* Other option at bottom of results */}
                      <TouchableOpacity
                        style={[styles.dropdownItem, styles.otherDropdownItem]}
                        onPress={handleSelectOther}
                      >
                        <ThemedText style={styles.otherLinkText}>
                          Can't find your school? Enter it manually
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Other link shown below input when search yields no results */}
                  {showOtherLink && (
                    <TouchableOpacity onPress={handleSelectOther} style={styles.otherLink}>
                      <ThemedText style={styles.otherLinkText}>
                        Can't find your school? Enter it manually
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

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
    color: "#1f2937",
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
  otherDropdownItem: {
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: "#e0e7ff",
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
  otherLink: {
    marginTop: 6,
    paddingHorizontal: 4,
  },
  otherLinkText: {
    fontSize: 13,
    color: "#4A90E2",
    fontWeight: "500",
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
})