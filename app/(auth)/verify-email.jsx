import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Colors } from '../../constants/Colors'

import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'
import Spacer from '../../components/Spacer'
import { useUser } from '../../hooks/useUser'

const VerifyEmail = () => {
  const router = useRouter()
  const { email, password } = useLocalSearchParams()
  const { resendVerificationEmail } = useUser()

  const [resendStatus, setResendStatus] = useState(null) 
  const [cooldown, setCooldown] = useState(false)

  const handleResend = async () => {
    if (cooldown || !email || !password) return
    setResendStatus('sending')
    try {
      const result = await resendVerificationEmail(email, password)
      if (result?.alreadyVerified) {
        router.replace('/login')
        return
      }
      setResendStatus('sent')
      setCooldown(true)
      setTimeout(() => setCooldown(false), 30000)
    } catch (err) {
      console.error("Resend error:", err)
      setResendStatus('error')
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>✉️</Text>
        </View>

        <Spacer height={20} />

        <ThemedText title style={styles.title}>
          Check Your Email
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          We sent a verification link to
        </ThemedText>
        {email ? (
          <ThemedText style={styles.emailText}>{email}</ThemedText>
        ) : null}

        <Spacer height={10} />

        <ThemedText style={styles.instruction}>
          Click the link in your email to verify your account, then come back and log in.
        </ThemedText>

        <Spacer height={30} />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>

        <Spacer height={14} />

        <TouchableOpacity
          style={[styles.resendButton, cooldown && styles.resendButtonDisabled]}
          onPress={handleResend}
          disabled={cooldown || resendStatus === 'sending'}
        >
          <Text style={[styles.resendButtonText, cooldown && styles.resendButtonTextDisabled]}>
            {resendStatus === 'sending'
              ? 'Sending...'
              : cooldown
              ? 'Email sent ✓'
              : 'Resend Verification Email'}
          </Text>
        </TouchableOpacity>

        {resendStatus === 'error' && (
          <ThemedText style={styles.errorText}>
            Something went wrong. Please try again.
          </ThemedText>
        )}

        <Spacer height={30} />

        <ThemedText style={styles.spamNote}>
          Don't see it? Check your spam folder.
        </ThemedText>
      </View>
    </ThemedView>
  )
}

export default VerifyEmail

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#bcd7f5ff',
  },
  card: {
    backgroundColor: '#ffffff',
    width: '85%',
    paddingVertical: 40,
    paddingHorizontal: 25,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 34,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90E2',
    textAlign: 'center',
    marginTop: 4,
  },
  instruction: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
  loginButton: {
    width: '80%',
    backgroundColor: '#4A90E2',
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#f2f2f2',
    fontWeight: '600',
    fontSize: 15,
  },
  resendButton: {
    width: '80%',
    backgroundColor: 'transparent',
    borderRadius: 22,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#4A90E2',
  },
  resendButtonDisabled: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  resendButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  resendButtonTextDisabled: {
    color: '#93C5FD',
  },
  errorText: {
    fontSize: 13,
    color: Colors.warning,
    marginTop: 8,
    textAlign: 'center',
  },
  spamNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
})
