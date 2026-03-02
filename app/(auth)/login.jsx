import { StyleSheet, Text, Keyboard, TouchableWithoutFeedback, TextInput, View } from 'react-native'
import { Link } from 'expo-router'
import { useState } from 'react'
import { Colors } from '../../constants/Colors'

import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'
import Spacer from '../../components/Spacer'
import ThemedButton from '../../components/ThemedButton'
import ThemedTextInput from "../../components/ThemedTextInput"
import { useUser } from '../../hooks/useUser'

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState()


  const {login} = useUser()

  const handleSubmit = async () => {
    setError(null)

    try {
      await login(email, password)
    } catch(error) {
      setError(error.message)

    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container}>
      <View style={styles.card}>
        <Spacer />
        <ThemedText title={true} style={styles.title}>
          Login to Your Account
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Welcome back 👋
        </ThemedText>
        {/* <TextInput placeholder="Email" /> */}

        <Spacer />
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

        <ThemedButton onPress={handleSubmit} style={styles.loginButton}>
          <Text style={{ color: '#f2f2f2' }}>Login</Text>
        </ThemedButton>

        <Spacer />
        {error && <Text style={styles.error}>{error}</Text>}


        <Spacer height={100} />
        <Link href="/register" replace>
          <ThemedText style={{ textAlign: "center" }}>
            Register instead
          </ThemedText>
        </Link>
      </View>
      </ThemedView>
    </TouchableWithoutFeedback>
  )
}

export default Login

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#bcd7f5ff"
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
   error: {
    color: Colors.warning,
    padding: 10,
    backgroundColor: '#f5c1c8',
    borderColor: Colors.warning,
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 10,
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
  loginButton: {
    width: "40%",
    backgroundColor: "#4A90E2",
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
  },
})