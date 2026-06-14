import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2b8a3e',
        tabBarInactiveTintColor: '#868e96',
        tabBarStyle: {
          ...styles.tabBar,
          height: Platform.OS === 'ios' ? 88 : 64 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? 24 : Math.max(10, insets.bottom),
        },
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="joins"
        options={{
          title: '조인 모집',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'golf' : 'golf-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="manage-joins"
        options={{
          title: '조인 관리',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: -3,
    },
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});

