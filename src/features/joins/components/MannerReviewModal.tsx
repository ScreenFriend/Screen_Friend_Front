import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../../api/client';
import { ParticipantResponse } from '../../../api/types';

interface MannerReviewModalProps {
  isVisible: boolean;
  onClose: () => void;
  joinPostId: number;
  onSuccess?: () => void;
}

export default function MannerReviewModal({ isVisible, onClose, joinPostId, onSuccess }: MannerReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<ParticipantResponse[]>([]);
  const [ratings, setRatings] = useState<{ [userId: number]: number }>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchParticipants = async () => {
    setLoading(true);
    try {
      const data = await apiService.getParticipantsToReview(joinPostId);
      setParticipants(data);
      // 아직 평가 안 한 유저의 초기 별점 점수를 1점으로 세팅
      const initialRatings: { [userId: number]: number } = {};
      data.forEach((p) => {
        if (!p.isReviewed) {
          initialRatings[p.id] = 1;
        }
      });
      setRatings(initialRatings);
    } catch (e) {
      console.log('평가 대상자 목록 조회 에러:', e);
      Alert.alert('오류', '평가 대상자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      fetchParticipants();
    }
  }, [isVisible, joinPostId]);

  const handleRatingChange = (userId: number, rating: number) => {
    // 별점 최소 1점 제한
    const safeRating = Math.max(1, rating);
    setRatings((prev) => ({ ...prev, [userId]: safeRating }));
  };

  const submitReview = async (targetUserId: number) => {
    const rating = ratings[targetUserId] || 1;
    setSubmittingId(targetUserId);
    try {
      await apiService.createMannerReview({
        joinPostId,
        targetUserId,
        rating,
      });
      Alert.alert('완료', '매너 평가가 반영되었습니다.');
      // 목록 갱신
      setParticipants((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, isReviewed: true } : p))
      );
      if (onSuccess) {
        onSuccess();
      }
    } catch (e: any) {
      console.log('리뷰 등록 오류:', e);
      const errMsg = e.response?.data?.message || '매너 평가 등록에 실패했습니다.';
      Alert.alert('평가 실패', errMsg);
    } finally {
      setSubmittingId(null);
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp >= 37.5) return '#2b8a3e'; // 우수 (그린)
    if (temp >= 36.5) return '#e8590c'; // 보통 (오렌지)
    return '#1c7ed6'; // 불량 (블루)
  };

  const renderStarRating = (userId: number, currentRating: number, disabled: boolean) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          disabled={disabled}
          onPress={() => handleRatingChange(userId, i)}
          style={styles.starTouch}
        >
          <Ionicons
            name={i <= currentRating ? 'star' : 'star-outline'}
            size={24}
            color={i <= currentRating ? '#ffd43b' : '#dee2e6'}
          />
        </TouchableOpacity>
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* 모달 헤더 */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⛳ 동반자 매너 평가</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#495057" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2b8a3e" />
            </View>
          ) : participants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>평가할 수 있는 동반 참여자가 없습니다.</Text>
            </View>
          ) : (
            <FlatList
              data={participants}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const currentRating = ratings[item.id] || 1;
                const isSubmitting = submittingId === item.id;

                return (
                  <View style={styles.participantItem}>
                    {/* 유저 프로필 및 닉네임 */}
                    <View style={styles.userInfoRow}>
                      {item.profileImageUrl ? (
                        <Image source={{ uri: item.profileImageUrl }} style={styles.profileImg} />
                      ) : (
                        <View style={styles.profilePlaceholder}>
                          <Ionicons name="person" size={20} color="#adb5bd" />
                        </View>
                      )}
                      <View style={styles.userMeta}>
                        <Text style={styles.nickname}>{item.nickname}</Text>
                        <Text style={[styles.temperature, { color: getTemperatureColor(item.mannerTemperature) }]}>
                          🌡️ {item.mannerTemperature}°C
                        </Text>
                      </View>
                    </View>

                    {/* 별점 및 평가 제출 영역 */}
                    <View style={styles.reviewRow}>
                      {item.isReviewed ? (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={16} color="#2b8a3e" />
                          <Text style={styles.completedText}>평가 완료</Text>
                        </View>
                      ) : (
                        <>
                          {renderStarRating(item.id, currentRating, isSubmitting)}
                          <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={() => submitReview(item.id)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.submitBtnText}>제출</Text>
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '45%',
    maxHeight: '80%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#868e96',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  participantItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  profilePlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMeta: {
    marginLeft: 12,
  },
  nickname: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#343a40',
  },
  temperature: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouch: {
    padding: 4,
  },
  submitBtn: {
    backgroundColor: '#2b8a3e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6fcf5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  completedText: {
    color: '#2b8a3e',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
