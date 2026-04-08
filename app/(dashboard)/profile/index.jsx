import { StyleSheet, View, Image, Dimensions, Text, TouchableOpacity, ActivityIndicator, Alert, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Modal, TextInput } from 'react-native';
import React, { useEffect, useState } from 'react';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  updateNotificationPreference,
  getNotificationPreference
} from '../../../notificationService';

import { useRouter } from 'expo-router';
import { useUser } from '../../../hooks/useUser';

import ThemedText from "../../../components/ThemedText";
import ThemedView from "../../../components/ThemedView";
import ThemedButton from "../../../components/ThemedButton";
import Spacer from "../../../components/Spacer";

const { width } = Dimensions.get('window');

const Profile = () => {
  const router = useRouter();
  const { logout, user, authChecked, resetPassword, deleteAccount } = useUser();
  const [notif, setNotif] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [stats, setStats] = useState({ donations: 0, received: 0 });

  useEffect(() => {
    if (!user?.uid) return;
    loadNotificationPreference();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'requests'),
      where('userId', '==', user.uid),
      where('status', '==', 'completed')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let donationCount = 0;
        let receivedCount = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          const total = (data.quantities || []).reduce((sum, qty) => sum + (qty || 0), 0);

          if (data.type === 'donate') {
            donationCount += total;
          } else if (data.type === 'receive') {
            receivedCount += total;
          }
        });

        setStats({ donations: donationCount, received: receivedCount });
      },
      (err) => {
        console.error('Error listening to stats:', err);
      }
    );

    return () => unsubscribe();
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

  const handleResetPassword = async () => {
    try {
      await resetPassword(user.email);
      setResetSent(true);
      Alert.alert('Check your email', `A password reset link was sent to ${user.email}.`);
    } catch (err) {
      Alert.alert('Error', "Couldn't send the reset email. Try again.");
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => setShowDeleteModal(true) },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your password.');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteAccount(deletePassword);
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please try again.');
      } else {
        setDeleteError('Something went wrong. Please try again.');
      }
      setDeleteLoading(false);
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
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBackground} />

      <View style={styles.header}>
        <View style={styles.curveOverlay} />
        <Spacer />
        <Image
          source={require('../../../assets/icons/profile.png')}
          style={styles.profileImage}
        />

        <Spacer height={5} />
        <ThemedText title style={styles.heading}>{user.name}</ThemedText>

        <Spacer height={5} />
        <ThemedText title style={styles.subheading}>
          {user.label === 'teacher' ? 'Teacher' : 'Parent'}
        </ThemedText>

        {user?.school && (
          <>
            <Spacer height={8} />
            <View style={styles.schoolBadge}>
              <FontAwesome6 name="school" size={14} color="#4A90E2" />
              <ThemedText style={styles.schoolText}>{user.school.schoolName}</ThemedText>
            </View>
          </>
        )}

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

      <View style={styles.impactSection}>
        <ThemedText style={styles.impactTitle}>Your Impact</ThemedText>
        <Spacer height={15} />

        <View style={styles.impactRow}>
          <View style={styles.impactCard}>
            <Ionicons name="school-outline" size={28} color="#4A90E2" />
            <ThemedText style={styles.impactNumber}>{stats.donations}</ThemedText>
            <ThemedText style={styles.impactLabel}>Items Donated</ThemedText>
          </View>

          <View style={styles.impactCard}>
            <Ionicons name="heart-outline" size={28} color="#4A90E2" />
            <ThemedText style={styles.impactNumber}>{stats.received}</ThemedText>
            <ThemedText style={styles.impactLabel}>Items Received</ThemedText>
          </View>
        </View>
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
            icon="key-outline"
            label={resetSent ? "Reset email sent" : "Reset password"}
            onPress={handleResetPassword}
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
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            isDestructive
            onPress={confirmDelete}
          />
        </View>
      </View>

      <Spacer height={100} />

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="warning-outline" size={32} color="#d9534f" />
            </View>

            <Text style={styles.modalTitle}>Confirm Deletion</Text>
            <Text style={styles.modalSubtitle}>
              Enter your password to permanently delete your account and all associated data.
            </Text>

            <TextInput
              style={[styles.modalInput, deleteError ? styles.modalInputError : null]}
              placeholder="Your password"
              placeholderTextColor="#aaa"
              secureTextEntry
              value={deletePassword}
              onChangeText={(t) => { setDeletePassword(t); setDeleteError(''); }}
              autoCapitalize="none"
            />

            {deleteError ? <Text style={styles.modalError}>{deleteError}</Text> : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                disabled={deleteLoading}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDeleteBtn, deleteLoading && { opacity: 0.6 }]}
                onPress={handleDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete forever</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
        <Ionicons name={icon} size={22} color={isDestructive ? '#d9534f' : '#333'} />
        <Text style={[styles.rowLabel, isDestructive && { color: '#d9534f' }]}>{label}</Text>
      </View>

      <View style={styles.rowRight}>
        {showSwitch ? (
          <Switch value={switchValue} onValueChange={onSwitchChange} disabled={loading} />
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
  container: { flex: 1 },
  topBackground: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: "20%",
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
  scrollView: {
    flex: 1,
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
    left: -width * 0.15,
    width: width * 1.3,
    height: 475,
    backgroundColor: '#f8f9fa',
    borderRadius: 350,
    zIndex: 0,
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
    maxWidth: "65%",
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
    borderRadius: 30,
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
  impactSection: {
    width: '90%',
    alignSelf: 'center',
    marginTop: 10,
  },
  impactTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A90E2',
    textAlign: 'center',
  },
  impactRow: {
    flexDirection: 'row',
  },
  impactCard: {
    flex: 1,
    marginHorizontal: 15,
    width: '35%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bed1e7',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  impactNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  impactLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 3,
    color: '#555',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#F3F6FB',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 8,
  },
  modalInputError: {
    borderColor: '#d9534f',
    backgroundColor: '#fff5f5',
  },
  modalError: {
    color: '#d9534f',
    fontSize: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e0e7ff',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 15,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#d9534f',
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});