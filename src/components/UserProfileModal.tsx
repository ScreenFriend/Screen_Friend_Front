import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService, API_BASE_URL } from '../api/client';
import { UserProfileResponse } from '../api/types';

interface UserProfileModalProps {
  userId: number | null;
  isVisible: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ userId, isVisible, onClose }: UserProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);

  useEffect(() => {
    if (isVisible && userId) {
      const fetchProfile = async () => {
        setLoading(true);
        try {
          const data = await apiService.getUserProfileCard(userId);
          setProfile(data);
        } catch (e) {
          console.log('유저 프로필 조회 실패:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [isVisible, userId]);

  const getTemperatureColor = (temp: number) => {
    if (temp >= 37.5) return '#2b8a3e';
    if (temp >= 36.5) return '#e8590c';
    return '#1c7ed6';
  };



  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.cardContainer} 
          activeOpacity={1}
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2b8a3e" />
            </View>
          ) : profile ? (
            <View style={styles.content}>
              {/* 닫기 버튼 */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#868e96" />
              </TouchableOpacity>

              {/* 상단 프로필 이미지 & 기본 정보 */}
              <View style={styles.avatarSection}>
                {profile.profileImageUrl ? (
                  <Image
                    source={{
                      uri: profile.profileImageUrl.startsWith('http')
                        ? profile.profileImageUrl
                        : `${API_BASE_URL}${profile.profileImageUrl}`
                    }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={44} color="#adb5bd" />
                  </View>
                )}
                <Text style={styles.nickname}>{profile.nickname}</Text>
                <View style={styles.averageScoreBadge}>
                  <Text style={styles.averageScoreText}>
                    ⛳ 평균 타수: {profile.averageScore !== null ? `${profile.averageScore}타` : '미공개'}
                  </Text>
                </View>
              </View>

              {/* 매너 온도 섹션 */}
              <View style={styles.tempSection}>
                <View style={styles.tempHeader}>
                  <Text style={styles.tempTitle}>🌡️ 매너 온도</Text>
                  <Text style={[styles.tempNum, { color: getTemperatureColor(profile.mannerTemperature) }]}>
                    {profile.mannerTemperature}°C
                  </Text>
                </View>
                {/* 게이지 바 */}
                <View style={styles.gaugeContainer}>
                  <View 
                    style={[
                      styles.gaugeFill, 
                      { 
                        width: `${Math.min(100, (profile.mannerTemperature / 99) * 100)}%`,
                        backgroundColor: getTemperatureColor(profile.mannerTemperature)
                      }
                    ]} 
                  />
                </View>
              </View>

              {/* 간단 소개 섹션 */}
              <View style={styles.bioSection}>
                <Text style={styles.bioLabel}>간단 소개</Text>
                <View style={styles.bioBox}>
                  <Text style={styles.bioText}>
                    {profile.bio || '등록된 소개글이 없는 유저입니다.'}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>유저 정보를 불러올 수 없습니다.</Text>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  loadingBox: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f1f3f5',
    borderWidth: 3,
    borderColor: '#e6fcf5',
  },
  nickname: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 12,
  },
  averageScoreBadge: {
    marginTop: 8,
    backgroundColor: '#e6fcf5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c3fae8',
  },
  averageScoreText: {
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: 'bold',
  },
  tempSection: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tempHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tempTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#495057',
  },
  tempNum: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  gaugeContainer: {
    height: 8,
    backgroundColor: '#dee2e6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  bioSection: {
    width: '100%',
    alignItems: 'flex-start',
  },
  bioLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  bioBox: {
    width: '100%',
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    padding: 14,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  bioText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },
  errorBox: {
    padding: 30,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#fa5252',
    fontWeight: 'bold',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e6fcf5',
  },
});
