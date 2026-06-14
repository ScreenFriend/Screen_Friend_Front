import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { JoinPostRequest, JoinPostResponse, UserResponse, UserSignUpRequest, PlaceSearchResponse, JoinApplicationResponse, ParticipantResponse, MannerReviewRequest, UserStatsResponse, UserProfileResponse, ChatMessage } from './types';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { store } from '../store';
import { clearAuth } from '../store/authSlice';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        // 모바일 앱 환경 세션 유지를 위해 커스텀 헤더 주입
        config.headers['X-Auth-Token'] = token;
      }
    } catch (e) {
      console.log('[apiClient] Request Interceptor Error:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const isUnauthorized = error.response && error.response.status === 401;
    const isUserNotFound = error.response && error.response.status === 404 && error.response.data?.code === 'USER-003';

    if (isUnauthorized || isUserNotFound) {
      console.log('[apiClient] 무효한 세션(401/404) 감지. 세션 초기화 진행...');
      try {
        await SecureStore.deleteItemAsync('userToken');
        store.dispatch(clearAuth());
        Alert.alert(
          '세션 만료',
          isUserNotFound ? '존재하지 않는 사용자 세션입니다. 다시 로그인해 주세요.' : '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.',
          [
            {
              text: '확인',
              onPress: () => {
                router.replace('/login');
              }
            }
          ]
        );
      } catch (e) {
        console.log('[apiClient] 세션 에러 핸들링 실패:', e);
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // 조인글 API
  getJoinPosts: async (dong?: string): Promise<JoinPostResponse[]> => {
    const response = await apiClient.get<JoinPostResponse[]>('/api/joins', {
      params: dong ? { dong } : {}
    });
    return response.data;
  },
  getJoinPost: async (id: number): Promise<JoinPostResponse> => {
    const response = await apiClient.get<JoinPostResponse>(`/api/joins/${id}`);
    return response.data;
  },
  createJoinPost: async (data: JoinPostRequest): Promise<JoinPostResponse> => {
    const response = await apiClient.post<JoinPostResponse>('/api/joins', data);
    return response.data;
  },
  updateJoinPostStatus: async (id: number, status: string): Promise<JoinPostResponse> => {
    const response = await apiClient.patch<JoinPostResponse>(`/api/joins/${id}/status?status=${status}`);
    return response.data;
  },
  joinPost: async (id: number): Promise<JoinPostResponse> => {
    const response = await apiClient.post<JoinPostResponse>(`/api/joins/${id}/join`);
    return response.data;
  },
  leavePost: async (id: number): Promise<JoinPostResponse> => {
    const response = await apiClient.post<JoinPostResponse>(`/api/joins/${id}/leave`);
    return response.data;
  },
  deleteJoinPost: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/joins/${id}`);
  },
  updateJoinPostReservation: async (id: number, isReserved: boolean): Promise<JoinPostResponse> => {
    const response = await apiClient.patch<JoinPostResponse>(`/api/joins/${id}/reserved`, null, {
      params: { isReserved }
    });
    return response.data;
  },
  applyJoin: async (id: number): Promise<void> => {
    await apiClient.post(`/api/joins/${id}/apply`);
  },
  getJoinApplications: async (id: number): Promise<JoinApplicationResponse[]> => {
    const response = await apiClient.get<JoinApplicationResponse[]>(`/api/joins/${id}/applications`);
    return response.data;
  },
  acceptApplication: async (applicationId: number): Promise<JoinPostResponse> => {
    const response = await apiClient.patch<JoinPostResponse>(`/api/joins/applications/${applicationId}/accept`);
    return response.data;
  },
  rejectApplication: async (applicationId: number): Promise<void> => {
    await apiClient.patch(`/api/joins/applications/${applicationId}/reject`);
  },
  getMyApplication: async (id: number): Promise<JoinApplicationResponse | null> => {
    const response = await apiClient.get<JoinApplicationResponse | null>(`/api/joins/${id}/my-application`);
    return response.data;
  },
  getMyCreatedJoins: async (): Promise<JoinPostResponse[]> => {
    const response = await apiClient.get<JoinPostResponse[]>('/api/joins/my/created');
    return response.data;
  },
  getMyAppliedJoins: async (): Promise<JoinPostResponse[]> => {
    const response = await apiClient.get<JoinPostResponse[]>('/api/joins/my/applied');
    return response.data;
  },
  getMyCompletedJoins: async (): Promise<JoinPostResponse[]> => {
    const response = await apiClient.get<JoinPostResponse[]>('/api/joins/my/completed');
    return response.data;
  },
  getRegionDong: async (latitude: number, longitude: number): Promise<string> => {
    const response = await apiClient.get<string>('/api/places/region', {
      params: { latitude, longitude }
    });
    return response.data;
  },

  // 유저 API
  signUp: async (data: UserSignUpRequest): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>('/api/users/signup', data);
    return response.data;
  },
  getUserProfile: async (id: number): Promise<UserResponse> => {
    const response = await apiClient.get<UserResponse>(`/api/users/${id}`);
    return response.data;
  },
  updateProfile: async (
    id: number,
    nickname?: string,
    password?: string,
    imageUri?: string,
    averageScore?: number | null,
    bio?: string
  ): Promise<UserResponse> => {
    const formData = new FormData();
    if (nickname) formData.append('nickname', nickname);
    if (password) formData.append('password', password);
    if (averageScore !== undefined) {
      formData.append('averageScore', averageScore === null ? '' : String(averageScore));
    }
    if (bio !== undefined) {
      formData.append('bio', bio);
    }

    if (imageUri) {
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('profileImage', {
        uri: imageUri,
        name: filename,
        type,
      } as any);
    }

    const response = await apiClient.put<UserResponse>(`/api/users/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  withdraw: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/users/${id}`);
  },
  getUserProfileCard: async (id: number): Promise<UserProfileResponse> => {
    const response = await apiClient.get<UserProfileResponse>(`/api/users/${id}/profile`);
    return response.data;
  },
  getChatMessages: async (joinPostId: number): Promise<ChatMessage[]> => {
    const response = await apiClient.get<ChatMessage[]>(`/api/joins/${joinPostId}/chats`);
    return response.data;
  },

  // 포트원 검증 API
  verifyPortOne: async (identityVerificationId: string): Promise<{ name: string; phone: string; gender: string }> => {
    const response = await apiClient.post('/api/auth/portone/verify', { identityVerificationId });
    return response.data;
  },

  // 실제 주변 스크린 골프장 검색 API
  searchScreenGolf: async (latitude: number, longitude: number): Promise<PlaceSearchResponse[]> => {
    const response = await apiClient.get<PlaceSearchResponse[]>('/api/places/search', {
      params: { latitude, longitude }
    });
    return response.data;
  },

  // 매너 리뷰 API
  getParticipantsToReview: async (joinPostId: number): Promise<ParticipantResponse[]> => {
    const response = await apiClient.get<ParticipantResponse[]>(`/api/reviews/participants/${joinPostId}`);
    return response.data;
  },
  createMannerReview: async (request: MannerReviewRequest): Promise<void> => {
    await apiClient.post('/api/reviews', request);
  },
  
  // 내 스탯 API
  getMyStats: async (): Promise<UserStatsResponse> => {
    const response = await apiClient.get<UserStatsResponse>('/api/users/me/stats');
    return response.data;
  },

  // 삭제 동네 필터 API
  addRemovedDong: async (dongName: string): Promise<UserResponse> => {
    const response = await apiClient.post<UserResponse>('/api/users/me/removed-dongs', null, {
      params: { dongName }
    });
    return response.data;
  },
  removeRemovedDong: async (dongName: string): Promise<UserResponse> => {
    const response = await apiClient.delete<UserResponse>('/api/users/me/removed-dongs', {
      params: { dongName }
    });
    return response.data;
  },
  clearRemovedDongs: async (): Promise<UserResponse> => {
    const response = await apiClient.delete<UserResponse>('/api/users/me/removed-dongs/clear');
    return response.data;
  },
};
