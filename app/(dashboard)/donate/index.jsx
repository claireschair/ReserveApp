import { StyleSheet, View, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import Spacer from "../../../components/Spacer";

import DonateIcon from "../../../assets/icons/donate.png";

const { width } = Dimensions.get('window');

const Receive = () => {
  const router = useRouter();

  const buttons = [
    {
      icon: 'document-text-outline',
      label: 'Donation Form',
      description: 'Fill out the donation form to contribute items or funds to your community.',
      route: '/(dashboard)/donate/form',
    },
    {
      icon: 'location-outline',
      label: 'Donation Spots',
      description: 'Find nearby donation centers where you can drop off your contributions.',
      route: '/(dashboard)/map',
    },
    {
      icon: 'heart-circle-outline',
      label: 'View Wishlists',
      description: 'See the Amazon wishlists that teachers currently need most.',
      route: '/(dashboard)/donate/wishlist',
    },
    {
      icon: 'list-outline',
      label: 'Manage Donations',
      description: 'Keep track of your donations and manage your giving history easily.',
      route: '/(dashboard)/donate/donationlist',
    },
    {
      icon: 'time-outline',
      label: 'Donation History',
      description: 'Browse previously completed donations and chat history.',
      route: '/(dashboard)/donate/history',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.topBackground} />
          <View style={styles.curveOverlay} />
          <Image source={DonateIcon} style={styles.logo} resizeMode="contain" />
          <Spacer height={15} />

          <ThemedText title style={styles.heading}>Donate</ThemedText>
          <ThemedText style={styles.subtitle}>Support your community through giving</ThemedText>
        </View>

        <Spacer height={30} />

        <View style={styles.buttonsContainer}>
          {buttons.map((btn, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.buttonWithDesc}
              activeOpacity={0.85}
              onPress={() => router.push(btn.route)}
            >
              <View style={styles.squareButton}>
                <Ionicons name={btn.icon} size={50} color="#fff" />
              </View>

              <View style={styles.descContainer}>
                <ThemedText style={styles.buttonLabel}>{btn.label}</ThemedText>
                <ThemedText style={styles.description}>{btn.description}</ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Spacer height={50} />
      </ScrollView>
    </ThemedView>
  );
};

export default Receive;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContainer: { alignItems: 'center', paddingBottom: 50, backgroundColor: '#f8f9fa' },

  header: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 30,
  },

  topBackground: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 250,
    backgroundColor: '#4A90E2',
    zIndex: 0,
  },

  curveOverlay: {
    position: 'absolute',
    top: 160,
    left: -width * 0.15,
    width: width * 1.3,
    height: 475,
    backgroundColor: '#f8f9fa',
    borderRadius: 350,
    zIndex: 0,
  },

  scrollView:{
    flex:1,
    backgroundColor: "#4A90E2",
  },

  logo: {
    width: 150,
    height: 150,
    zIndex: 1,
    marginTop: 40,
  },

  heading: {
    fontWeight: 'bold',
    fontSize: 30,
    marginTop: 20,
    zIndex: 1,
    color: 'black',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 40,
  },

  buttonsContainer: {
    width: '90%',
    marginTop: 20,
  },

  buttonWithDesc: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },

  squareButton: {
    width: 90,
    height: 90,
    backgroundColor: '#6cc8df',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  descContainer: {
    flex: 1,
    marginLeft: 15,
  },

  buttonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },

  description: {
    fontSize: 14,
    color: '#666',
  },
});