import { StyleSheet, Text, View, Image, Pressable } from 'react-native'
import { Link } from 'expo-router'

import ThemedView from '../components/ThemedView'
import ThemedText from '../components/ThemedText'
import ThemedLogo from '../components/ThemedLogo'
import Spacer from '../components/Spacer'

const Home = () => {
  return (
    
    <ThemedView style={styles.container}>
      
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <ThemedLogo />
        </View>

        <Spacer height={20} />

        <ThemedText style={styles.title} title>
          Reserve
        </ThemedText>

        <ThemedText style={styles.subtitle}>
          Making school supplies accessible to every classroom
        </ThemedText>
      </View>

      <View style={styles.buttonGroup}>
        <Link href="/login" asChild>
          <Pressable style={styles.button}>
            <ThemedText style={styles.buttonText}>
              Login
            </ThemedText>
          </Pressable>
        </Link>

        <Link href="/register" asChild>
          <Pressable style={styles.button}>
            <ThemedText style={styles.buttonText}>
              Register
            </ThemedText>
          </Pressable>
        </Link>
      </View>

    </ThemedView>
    
  )
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80, 
    backgroundColor: '#bcd7f5ff'
  },

  logoCircle: {
    backgroundColor: '#fff',
    width: 180,
    height: 180,
    borderRadius: 100, 
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  title: {
    fontSize: 35,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 20
  },

  subtitle: {
    marginTop: 6,
    opacity: 0.8,
    marginBottom: 22,
    maxWidth: '60%',
    textAlign: 'center',
    fontWeight: '600'
  },

  buttonGroup: {
    width: '60%',
    gap: 14,
  },

  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 22,    
    paddingVertical: 14,
    alignItems: 'center',
  },

  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffffff'
  },
  
})