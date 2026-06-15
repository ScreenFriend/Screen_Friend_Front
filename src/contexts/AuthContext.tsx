import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import { UserResponse } from '../api/types';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setUser as setUserAction, setUserToken as setUserTokenAction } from '../store/authSlice';

interface AuthContextType {
  user: UserResponse | null;
  setUser: (user: UserResponse | null) => void;
  userToken: string | null;
  setUserToken: (token: string | null) => void;
  isLoading: boolean;
  checkLogin: () => Promise<void>;
  logout: () => void;
  isPhoneVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const userToken = useSelector((state: RootState) => state.auth.userToken);
  const [isLoading, setIsLoading] = useState(true);

  const setUser = (newUser: UserResponse | null) => {
    dispatch(setUserAction(newUser));
  };

  const setUserToken = (newToken: string | null) => {
    dispatch(setUserTokenAction(newToken));
  };


  const segments = useSegments();
  const router = useRouter();

  const checkLogin = async () => {
    console.log('[AuthContext] checkLogin 시작...');
    try {
      const token = await SecureStore.getItemAsync('userToken');
      console.log('[AuthContext] 로컬 저장소 토큰 조회 결과:', token);

      if (token) {
        setUserToken(token);
        console.log('[AuthContext] /api/users/me 호출 시도...');
        const response = await apiClient.get<UserResponse>('/api/users/me');
        console.log('[AuthContext] /api/users/me 호출 성공:', response.data);
        setUser(response.data);
      } else {
        setUserToken(null);
        setUser(null);
      }
    } catch (e: any) {
      console.error('[AuthContext] 로그인 검증 에러:', e.message);
      // 세션 만료(401) 또는 유저 삭제/미존재(404) 에러 시 로컬 토큰 자동 삭제 처리
      if (e.response && (e.response.status === 401 || e.response.status === 404)) {
        console.log('[AuthContext] 무효한 세션 감지. 토큰 파기 및 로그아웃 처리합니다.');
        await SecureStore.deleteItemAsync('userToken');
        setUserToken(null);
        setUser(null);
      }
    } finally {
      console.log('[AuthContext] checkLogin 종료 (isLoading = false)');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/logout');
    } catch (e) {
      console.log('로그아웃 에러:', e);
    } finally {
      await SecureStore.deleteItemAsync('userToken');
      setUserToken(null);
      setUser(null);
      router.replace('/login');
    }
  };

  useEffect(() => {
    checkLogin();
  }, []);

  // 인증 가드 로직 (토큰 여부로 판단)
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments.length > 0 && (segments[0] === 'login' || segments[0] === 'signup');
    const isInitialRoute = segments.length === 0 || segments[0] === '';
    console.log('[AuthContext] Guard Check - segments:', segments, 'inAuthGroup:', inAuthGroup, 'isInitialRoute:', isInitialRoute, 'hasToken:', !!userToken);

    // Expo Router 네비게이션 마운트 시점 씹힘 방지를 위한 50ms 미세 지연 실행
    const timer = setTimeout(() => {
      if (!userToken && !inAuthGroup && !isInitialRoute) {
        console.log('[AuthContext] Redirecting to /login');
        router.replace('/login');
      } else if (userToken && (inAuthGroup || isInitialRoute)) {
        // 토큰이 있는데 로그인 그룹에 있거나 최초 마운트 빈 경로([]) 상태이면 메인화면으로 리다이렉트
        console.log('[AuthContext] Redirecting to /(tabs)');
        router.replace('/(tabs)');
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [userToken, segments, isLoading]);

  const isPhoneVerified = !!(user && user.phoneNumber && /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(user.phoneNumber) && user.phoneNumber !== '000-0000-0000');

  return (
    <AuthContext.Provider value={{ user, setUser, userToken, setUserToken, isLoading, checkLogin, logout, isPhoneVerified }}>
      {children}
    </AuthContext.Provider>
  );
}
