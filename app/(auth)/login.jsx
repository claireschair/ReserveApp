import { StyleSheet, Text, Keyboard, TouchableWithoutFeedback, View } from 'react-native'
import { Link, useRouter } from 'expo-router'
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
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetStatus, setResetStatus] = useState(null) 
  const [resetLoading, setResetLoading] = useState(false)
  const { login, resetPassword } = useUser()
  const router = useRouter()

  const handleSubmit = async () => {
    setError(null)
    try {
      await login(email, password)
    } catch (error) {
      if (error.code === "auth/email-not-verified") {
        router.push({
          pathname: "/(auth)/verify-email",
          params: { email, password },
        })
        return
      }
      setError(error.message)
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) return
    setResetLoading(true)
    setResetStatus(null)
    try {
      await resetPassword(resetEmail.trim())
      setResetStatus('sent')
    } catch (err) {
      setResetStatus('error')
    } finally {
      setResetLoading(false)
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

          <Spacer />
          <ThemedTextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
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

          <Text
            style={styles.forgotLink}
            onPress={() => {
              setShowForgot(!showForgot)
              setResetEmail(email)
              setResetStatus(null)
            }}
          >
            Forgot password?
          </Text>

          {showForgot && (
            <View style={styles.forgotBox}>
              {resetStatus === 'sent' ? (
                <Text style={styles.resetSuccess}>
                  ✓ Reset link sent! Check your email.
                </Text>
              ) : (
                <>
                  <ThemedTextInput
                    style={[styles.input, { marginBottom: 10 }]}
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {resetStatus === 'error' && (
                    <Text style={styles.resetError}>
                      Couldn't send reset email. Check the address and try again.
                    </Text>
                  )}
                  <ThemedButton
                    onPress={handleResetPassword}
                    style={styles.resetButton}
                    disabled={resetLoading}
                  >
                    <Text style={{ color: '#f2f2f2', fontSize: 13 }}>
                      {resetLoading ? 'Sending...' : 'Send reset link'}
                    </Text>
                  </ThemedButton>
                </>
              )}
            </View>
          )}

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
    textAlign: "center",
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
  forgotLink: {
    marginTop: 14,
    color: "#4A90E2",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  forgotBox: {
    width: "90%",
    marginTop: 12,
    alignItems: "center",
    backgroundColor: "#F3F6FB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  resetButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  resetSuccess: {
    color: "#2e7d32",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 4,
  },
  resetError: {
    color: Colors.warning,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
})