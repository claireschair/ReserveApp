import { StyleSheet, View, Text, Image, useColorScheme, Pressable } from 'react-native';
import React from 'react';
import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import UserOnly from '../../components/auth/UserOnly';

const DashboardLayout = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const renderTabIcon = (iconSource, label, focused) => (
    <View style={styles.iconContainer}>
      <View style={[styles.iconWrapper, focused && styles.focusedCircle]}>
        <Image source={iconSource} resizeMode="contain" style={styles.icon} />
      </View>
      <Text
        style={[styles.label, focused && styles.focusedLabel]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );

  return (
    <UserOnly>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.navBackground,
          height: 80,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon(require('../../assets/icons/home.png'), 'Home', focused),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon(require('../../assets/icons/map.png'), 'Map', focused),
        }}
      />
      <Tabs.Screen
        name="donate"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon(require('../../assets/icons/donate.png'), 'Donate', focused),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon(require('../../assets/icons/receive.png'), 'Receive', focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) =>
            renderTabIcon(require('../../assets/icons/profile.png'), 'Profile', focused),
        }}
      />
    </Tabs>
    </UserOnly>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 60,
    marginTop: 0,
  },
  iconWrapper: {
    borderRadius: 20,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  focusedCircle: {
    backgroundColor: '#1053BC',
  },
  icon: {
    width: 25,
    height: 25,
  },
  label: {
    fontSize: 8,
    color: '#748c94',
    textAlign: 'center',
  },
  focusedLabel: {
    color: '#1053BC',
  },
});

export default DashboardLayout;
