export interface JoinPostRequest {
  title: string;
  golfCenterName: string;
  playDateTime: string; // ISO 8601
  maxPlayers: number;
  currentPlayers: number;
  description: string;
  address?: string;
  isReserved?: boolean;
  paymentType?: 'DUTCH_PAY' | 'HOST_PAYS' | 'OTHER';
  phone?: string;
}

export interface JoinPostResponse {
  id: number;
  title: string;
  golfCenterName: string;
  playDateTime: string;
  maxPlayers: number;
  currentPlayers: number;
  description: string;
  address?: string;
  dong?: string;
  isReserved?: boolean;
  creatorId?: number;
  creatorNickname?: string;
  creatorProfileImageUrl?: string;
  creatorMannerTemperature?: number;
  status: 'RECRUITING' | 'COMPLETED' | 'CANCELLED';
  myApplicationStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  paymentType?: 'DUTCH_PAY' | 'HOST_PAYS' | 'OTHER';
  phone?: string;
}

export interface JoinApplicationResponse {
  id: number;
  applicantId: number;
  applicantNickname: string;
  applicantGender: 'MALE' | 'FEMALE';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  applicantProfileImageUrl: string | null;
  applicantMannerTemperature: number;
}

export interface UserSignUpRequest {
  email: string;
  password?: string;
  passwordConfirm?: string;
  nickname: string;
  gender: 'MALE' | 'FEMALE';
  phoneNumber: string;
  identityVerificationId: string;
}

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  gender: 'MALE' | 'FEMALE';
  phoneNumber: string;
  profileImageUrl: string | null;
  provider: 'LOCAL' | 'GOOGLE' | 'KAKAO';
  mannerTemperature: number;
  averageScore: number | null;
  bio?: string;
  removedDongs?: string[];
}

export interface PlaceSearchResponse {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  phone?: string;
}

export interface ParticipantResponse {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  mannerTemperature: number;
  isReviewed: boolean;
}

export interface MannerReviewRequest {
  joinPostId: number;
  targetUserId: number;
  rating: number;
}

export interface UserStatsResponse {
  pendingJoinsCount: number;
  averageScore: number | null;
  mannerTemperature: number;
}

export interface UserProfileResponse {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  averageScore: number | null;
  mannerTemperature: number;
  bio?: string;
}

export interface ChatMessage {
  id: number;
  joinPostId: number;
  senderId: number;
  senderNickname: string;
  content: string;
  sendTime: string;
  senderProfileImageUrl?: string | null;
}


