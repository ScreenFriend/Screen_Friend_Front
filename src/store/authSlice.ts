import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserResponse, UserStatsResponse } from '../api/types';

interface AuthState {
  user: UserResponse | null;
  userToken: string | null;
  stats: UserStatsResponse | null;
}

const initialState: AuthState = {
  user: null,
  userToken: null,
  stats: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserResponse | null>) => {
      state.user = action.payload;
      // user 정보가 변경될 때 stats의 평균 타수와 매너 온도도 연동하여 업데이트합니다.
      if (action.payload) {
        if (state.stats) {
          state.stats.averageScore = action.payload.averageScore;
          state.stats.mannerTemperature = action.payload.mannerTemperature;
        } else {
          state.stats = {
            pendingJoinsCount: 0,
            averageScore: action.payload.averageScore,
            mannerTemperature: action.payload.mannerTemperature,
          };
        }
      }
    },
    setUserToken: (state, action: PayloadAction<string | null>) => {
      state.userToken = action.payload;
    },
    setStats: (state, action: PayloadAction<UserStatsResponse | null>) => {
      state.stats = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.userToken = null;
      state.stats = null;
    },
  },
});

export const { setUser, setUserToken, setStats, clearAuth } = authSlice.actions;
export default authSlice.reducer;
