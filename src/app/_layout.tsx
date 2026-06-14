import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { store } from '../store';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      
      try {
        // 1. 위치 권한 확인 및 요청
        const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
        if (locationStatus !== 'granted') {
          await Location.requestForegroundPermissionsAsync();
        }

        // 2. 사진첩 권한 확인 및 요청
        const { status: mediaStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (mediaStatus !== 'granted') {
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        }
      } catch (error) {
        console.warn('[RootLayout] 권한 초기 요청 중 오류 발생:', error);
      }
    })();
  }, []);

  return (
    <Provider store={store}>
      <AuthProvider>
        <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ title: '로그인' }} />
          <Stack.Screen name="signup" options={{ title: '회원가입' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="joins/create" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </Provider>
  );
}
