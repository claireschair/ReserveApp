import { StyleSheet, View, Image, Dimensions, Text, TouchableOpacity, ActivityIndicator, Alert, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useEffect, useState } from 'react';
import { 
  updateNotificationPreference, 
  getNotificationPreference 
} from '../../../notificationService';

import { useRouter } from 'expo-router'; 
import { useUser } from '../../../hooks/useUser';

import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import ThemedLogo from '../../../components/ThemedLogo';
import ThemedButton from "../../../components/ThemedButton";
import Spacer from "../../../components/Spacer";

const { width } = Dimensions.get('window');

const Profile = () => {
  const router = useRouter(); 
  const { logout, user, authChecked } = useUser();
  const [notif, setNotif] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(false);

  useEffect(() => {
    loadNotificationPreference();
  }, [user?.uid]);

  const loadNotificationPreference = async () => {
    if (!user?.uid) return;

    try {
      const enabled = await getNotificationPreference(user.uid);
      setNotif(enabled);
    } catch (err) {
      console.error('Error loading notification preference:', err);
      setNotif(true);
    }
  };

  const handleNotificationToggle = async (value) => {
    if (!user?.uid) return;

    setLoadingNotif(true);
    setNotif(value);

    try {
      await updateNotificationPreference(user.uid, value);
      Alert.alert('Success', `Notifications ${value ? 'enabled' : 'disabled'} successfully.`);
    } catch (err) {
      console.error('Error updating notifications:', err);
      setNotif(!value);
      Alert.alert('Error', 'Failed to update notification settings.');
    } finally {
      setLoadingNotif(false);
    }
  };

  if (!authChecked) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Spacer height={10} />
        <ThemedText title>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText title>No user logged in</ThemedText>
        <Spacer height={10} />
        <ThemedText>Try logging in again.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} >
      <View style={styles.topBackground} />

      <View style={styles.header}>
        <View style={styles.curveOverlay} />
        <Spacer />
        <Image
          source={require('../../../assets/icons/profile.png')}
          style={styles.profileImage}
        />

        <Spacer height={5} />
        <ThemedText title style={styles.heading}>
          {user.name}
        </ThemedText>
        
        <Spacer height={5} />
        <ThemedText title style={styles.subheading}>
          {user.label === 'teacher' ? 'Teacher' : 'Parent'}
        </ThemedText>
        
        {user?.school && (
          <>
            <Spacer height={8} />
            <View style={styles.schoolBadge}>
              <Ionicons name="school-outline" size={18} color="#4A90E2" />
              <ThemedText style={styles.schoolText}>
                {user.school.schoolName}
              </ThemedText>
            </View>
          </>
        )}

        <View style={[styles.row, { gap: 8 }]}>
        <FontAwesome5 name="school" size={18} color="#4A90E2" />
        <ThemedText title style={styles.subheading}>
          {user.school?.schoolName ?? userData?.school ?? null}
        </ThemedText>
        </View>

        <Spacer height={5} />
      </View>

      <View style={styles.rowButtons}>
        <ThemedButton 
          style={[styles.button, { backgroundColor: '#415ba8ff' }]} 
          onPress={() => router.push('/(dashboard)/receive/requestlist')}
        >
          <Text style={[styles.buttonText, { color: '#f2f2f2' }]}>Requests</Text>
        </ThemedButton>

        <ThemedButton 
          style={[styles.button, { backgroundColor: '#f2f2f2', borderWidth: 2, borderColor: '#415ba8ff' }]} 
          onPress={() => router.push('/(dashboard)/donate/donationlist')}
        >
          <Text style={[styles.buttonText, { color: '#415ba8ff' }]}>Donations</Text>
        </ThemedButton>
      </View>

      <Spacer height={25} />

      <View style={styles.settingsContainer}>
        <View style={styles.card}>
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            showSwitch
            switchValue={notif}
            onSwitchChange={handleNotificationToggle}
            loading={loadingNotif} 
          />
          <SettingsRow
            icon="document-text-outline"
            label="Terms & Conditions"
            onPress={() => router.push('/(dashboard)/profile/terms')}
          />
      
          <SettingsRow
            icon="lock-closed-outline"
            label="Privacy Policy"
            onPress={() => router.push('/(dashboard)/profile/privacy')}
          />
      
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label="Feedback"
            onPress={() => router.push('/(dashboard)/profile/feedback')}
          />
      
          <SettingsRow
            icon="mail-outline"
            label="Contact Us"
            onPress={() => router.push('/(dashboard)/profile/contact')}
          />
        </View>
      
        <View style={styles.card}>
          <SettingsRow
            icon="log-out-outline"
            label="Log Out"
            isDestructive
            onPress={logout}
          />
        </View>
      </View>
      <Spacer height={100} />
    </ScrollView>
  );
};

const SettingsRow = ({
  icon,
  label,
  value,
  onPress,
  isDestructive,
  showSwitch,
  switchValue,
  onSwitchChange,
  loading,
}) => {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={showSwitch ? null : onPress}
      activeOpacity={showSwitch ? 1 : 0.2}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={isDestructive ? '#d9534f' : '#333'}
        />
        <Text
          style={[
            styles.rowLabel,
            isDestructive && { color: '#d9534f' },
          ]}
        >
          {label}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {showSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            disabled={loading}
          />
        ) : (
          <>
            {value && <Text style={styles.rowValue}>{value}</Text>}
            <Ionicons name="chevron-forward" size={18} color="#999" />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default Profile;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },

  container: { flex: 1},

  topBackground: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: "30%",
    backgroundColor: "#4A90E2",
    zIndex: 0,
  },

  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 100, 
    marginTop: 25,
    zIndex: 1,
    backgroundColor: '#bcd7f5ff', 
  },

  scrollView:{
    flex:1,
    backgroundColor: "#4A90E2",
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
  },

  header: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    paddingTop: 30,
  },

  curveOverlay: {
    position: 'absolute',
    top: 160,
    left: -width*0.15,
    width: width*1.3,
    height: 475,
    backgroundColor: '#f8f9fa',
    borderRadius: 350,
    zIndex: 0, 
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
  subheading: {
    fontSize: 18,       
    fontWeight: '500',    
    color: '#555',        
    textAlign: 'center',
    marginTop: 4,       
    zIndex: 1,
    maxWidth: "65%"
  },
  schoolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  schoolText: {
    fontSize: 15,
    color: "#4A90E2",
    fontWeight: "600",
  },
  button: {
    width: "50%",
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 6,
    borderRadius: 30
  },

  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '65%', 
    alignSelf: 'center',
    marginVertical: 10,
    gap: 20, 
  },

  buttonText: {
    color: '#f2f2f2',
    fontSize: 18,   
    fontWeight: '600',
  },

  settingsButton: {
    position: 'absolute',
    bottom: 35,
    left: 35,
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: '#415ba8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutButton: {
    position: 'absolute',
    bottom: 35,
    left: 105,
    width: 55,
    height: 55,
    borderRadius: 12,
    backgroundColor: '#415ba8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingsContainer: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 10,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 20,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },

  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },

  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  rowValue: {
    fontSize: 14,
    color: '#999',
  },
});