import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Linking, Platform, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiService, API_BASE_URL } from '../../api/client';
import { JoinPostResponse, JoinApplicationResponse } from '../../api/types';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserProfileModal from '../../components/UserProfileModal';
import PortOneAuthWebView from '../../features/auth/components/PortOneAuthWebView';

export default function JoinDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isPhoneVerified, checkLogin } = useAuth(); // 로그인 유저 세션 및 인증 여부 획득

  const [authModalVisible, setAuthModalVisible] = useState(false);

  const handleAuthSuccess = async (identityVerificationId: string) => {
    setAuthModalVisible(false);
    if (!user) return;
    try {
      await apiService.verifySocialUser(user.id, identityVerificationId);
      Alert.alert('인증 성공', '휴대폰 본인인증이 완료되었습니다.');
      await checkLogin();
    } catch (e: any) {
      console.log('소셜 본인인증 연동 실패:', e);
      const errorMsg = e.response?.data?.message || '본인인증 연동 처리에 실패했습니다.';
      Alert.alert('인증 연동 실패', errorMsg);
    }
  };

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<JoinPostResponse | null>(null);

  // 개설자용: 신청자 목록
  const [applications, setApplications] = useState<JoinApplicationResponse[]>([]);
  // 일반 유저용: 나의 신청 현황
  const [myApplication, setMyApplication] = useState<JoinApplicationResponse | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  // 프로필 모달 관련 상태
  const [selectedUserIdForModal, setSelectedUserIdForModal] = useState<number | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const getTemperatureColor = (temp: number) => {
    if (temp >= 37.5) return '#2b8a3e';
    if (temp >= 36.5) return '#e8590c';
    return '#1c7ed6';
  };

  // 데이터 로딩
  const fetchDetail = async () => {
    try {
      // 1. 조인 정보 패치
      const postData = await apiService.getJoinPost(Number(id));
      setPost(postData);

      // 2. 로그인 유저가 존재할 때 분기 처리
      if (user) {
        const isCreator = postData.creatorId === user.id;

        if (isCreator) {
          // 개설자인 경우 신청 대기 목록 가져오기
          const apps = await apiService.getJoinApplications(postData.id);
          setApplications(apps);
        } else {
          // 일반 유저인 경우 본인의 신청 정보 조회
          const myApp = await apiService.getMyApplication(postData.id);
          setMyApplication(myApp);
        }
      }
    } catch (e) {
      console.log('조인 상세 로딩 실패:', e);
      Alert.alert('오류', '정보를 불러오는 도중 오류가 발생했습니다.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id, user]);

  // 참가 신청 쏘기 (일반 유저)
  const handleApply = async () => {
    if (!post) return;
    
    if (!isPhoneVerified) {
      Alert.alert(
        '본인인증 필요',
        '조인 참가 신청을 위해 최초 1회 휴대폰 본인인증이 필요합니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '인증하기', onPress: () => setAuthModalVisible(true) }
        ]
      );
      return;
    }

    setActionLoading(true);
    try {
      await apiService.applyJoin(post.id);
      Alert.alert('신청 성공', '⛳ 참가 신청을 완료했습니다. 개설자의 승인을 기다려주세요!');
      await fetchDetail(); // 갱신
    } catch (e: any) {
      console.log('참가 신청 오류:', e);
      Alert.alert('신청 실패', e.response?.data?.message || '신청 도중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 신청 수락 (개설자)
  const handleAccept = async (appId: number) => {
    setActionLoading(true);
    try {
      await apiService.acceptApplication(appId);
      Alert.alert('수락 완료', '⛳ 참가 신청을 수락하여 멤버로 등록했습니다.');
      await fetchDetail(); // 갱신
    } catch (e: any) {
      console.log('신청 수락 오류:', e);
      Alert.alert('수락 실패', e.response?.data?.message || '처리 도중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 신청 거절 (개설자)
  const handleReject = async (appId: number) => {
    Alert.alert('신청 거절', '이 참가 신청을 거절하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '거절',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await apiService.rejectApplication(appId);
            Alert.alert('거절 완료', '참가 신청을 거절했습니다.');
            await fetchDetail();
          } catch (e: any) {
            console.log('신청 거절 오류:', e);
            Alert.alert('거절 실패', e.response?.data?.message || '처리 도중 오류가 발생했습니다.');
          } finally {
            setActionLoading(false);
          }
        }
      }
    ]);
  };

  // 조인 삭제 (개설자)
  const handleDelete = () => {
    if (post.currentPlayers > 1) {
      Alert.alert('삭제 불가', '이미 참가한 멤버가 존재하는 조인은 삭제할 수 없습니다.');
      return;
    }

    Alert.alert(
      '조인 삭제',
      '정말 이 조인을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await apiService.deleteJoinPost(post.id);
              Alert.alert('삭제 완료', '조인이 정상적으로 삭제되었습니다.');
              router.back();
            } catch (e: any) {
              console.log('조인 삭제 오류:', e);
              Alert.alert('삭제 실패', e.response?.data?.message || '조인을 삭제하는 도중 오류가 발생했습니다.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  // 조인 참가 취소 (참가자)
  const handleLeave = () => {
    Alert.alert(
      '참가 취소',
      '정말 이 조인 참가를 취소하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            setActionLoading(true);
            try {
              await apiService.leavePost(post.id);
              Alert.alert('취소 완료', '참가 신청이 취소되었습니다.');
              await fetchDetail();
            } catch (e: any) {
              console.log('참가 취소 오류:', e);
              Alert.alert('취소 실패', e.response?.data?.message || '참가를 취소하는 도중 오류가 발생했습니다.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleConfirmReservation = async () => {
    if (!post) return;
    Alert.alert(
      '예약 완료 처리',
      '이 조인의 골프장 예약을 완료 상태로 변경하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '변경',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await apiService.updateJoinPostReservation(post.id, true);
              setPost(updated);
              Alert.alert('변경 완료', '⛳ 예약 완료 상태로 변경되었습니다.');
            } catch (e: any) {
              console.log('예약 완료 처리 오류:', e);
              Alert.alert('변경 실패', e.response?.data?.message || '예약 완료 상태 변경 중 오류가 발생했습니다.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading || !post) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b8a3e" />
      </View>
    );
  }

  const isCreator = user && post.creatorId === user.id;
  const isCompleted = post.status === 'COMPLETED';
  const isCancelled = post.status === 'CANCELLED';
  const progressPercent = Math.min(100, (post.currentPlayers / post.maxPlayers) * 100);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const week = ['일', '월', '화', '수', '목', '금', '토'];
      const rawHours = d.getHours();
      const ampm = rawHours >= 12 ? '오후' : '오전';
      let hours = rawHours % 12;
      hours = hours ? hours : 12;
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${week[d.getDay()]}) ${ampm} ${hours}:${minutes}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getPaymentTypeText = (type?: string) => {
    switch (type) {
      case 'DUTCH_PAY':
        return '더치페이';
      case 'HOST_PAYS':
        return '방장 부담';
      case 'OTHER':
        return '직접 협의';
      default:
        return '더치페이';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#343a40" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⛳ 조인 상세 정보</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 골프장 정보 카드 */}
        <View style={styles.card}>
          <View style={styles.golfCenterHeader}>
            <Text style={styles.cardSubtitle}>라운딩 골프장</Text>
            {/* 예약 여부 뱃지 노출 */}
            <View style={[
              styles.reservedBadge,
              post.isReserved ? styles.reservedComplete : styles.reservedWait
            ]}>
              <Text style={[
                styles.reservedText,
                post.isReserved ? { color: '#2b8a3e' } : { color: '#868e96' }
              ]}>
                {post.isReserved ? '⛳ 예약 완료' : '⏳ 예약 대기'}
              </Text>
            </View>
          </View>

          <Text style={styles.golfCenterName}>
            {post.dong ? `[${post.dong}] ` : ''}{post.golfCenterName}
          </Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color="#868e96" />
            <Text style={styles.addressText}>{post.address || '상세 주소 정보가 없습니다.'}</Text>
          </View>

          <View style={[styles.addressRow, { marginTop: -8, marginBottom: 16 }]}>
            <Ionicons name="call-outline" size={15} color="#868e96" />
            <Text style={styles.addressText}>{post.phone || '등록된 연락처가 없습니다.'}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: isCreator && !post.isReserved ? 12 : 0 }}>
            <TouchableOpacity
              style={[
                styles.callActionButton,
                !post.phone && styles.disabledCallActionButton
              ]}
              onPress={() => {
                if (post.phone) {
                  Linking.openURL(`tel:${post.phone}`).catch(() =>
                    Alert.alert('오류', '전화 앱을 열 수 없습니다.')
                  );
                }
              }}
              disabled={!post.phone}
            >
              <Ionicons name="call" size={16} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.kakaoMapButton, { flex: 1 }]}
              onPress={() => {
                const url = `https://map.kakao.com/link/search/${encodeURIComponent(post.golfCenterName)}`;
                Linking.openURL(url).catch(() => Alert.alert('링크 오류', '카카오맵 페이지를 열 수 없습니다.'));
              }}
            >
              <Ionicons name="map-outline" size={16} color="#2b8a3e" style={{ marginRight: 4 }} />
              <Text style={styles.kakaoMapButtonText}>골프장 상세 위치 검색</Text>
            </TouchableOpacity>
          </View>

          {isCreator && !post.isReserved && (
            <TouchableOpacity
              style={[
                styles.reserveCompleteBtn,
                actionLoading && styles.disabledBtn
              ]}
              onPress={handleConfirmReservation}
              disabled={actionLoading}
            >
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.reserveCompleteBtnText}>⛳ 예약 완료 상태로 변경</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 조인 디테일 세부 정보 */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardSubtitle}>모집 상세 정보</Text>
            <View style={[
              styles.statusBadge,
              isCompleted && { backgroundColor: '#e9ecef' },
              isCancelled && { backgroundColor: '#ffe3e3' }
            ]}>
              <Text style={[
                styles.statusText,
                isCompleted && { color: '#868e96' },
                isCancelled && { color: '#fa5252' }
              ]}>
                {post.status === 'RECRUITING' ? '모집중' : post.status === 'COMPLETED' ? '모집 완료' : '개설 취소'}
              </Text>
            </View>
          </View>

          <Text style={styles.joinTitle}>{post.title}</Text>

          {post.creatorNickname ? (
            <TouchableOpacity
              onPress={() => {
                if (post.creatorId) {
                  setSelectedUserIdForModal(post.creatorId);
                  setProfileModalVisible(true);
                }
              }}
              style={styles.creatorProfileRow}
              activeOpacity={0.7}
            >
              {post.creatorProfileImageUrl ? (
                <Image
                  source={{ uri: post.creatorProfileImageUrl.startsWith('http') ? post.creatorProfileImageUrl : `${API_BASE_URL}${post.creatorProfileImageUrl}` }}
                  style={styles.creatorAvatar}
                />
              ) : (
                <Ionicons name="person-circle-outline" size={32} color="#adb5bd" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.creatorLabel}>개설자</Text>
                <View style={styles.creatorNameRow}>
                  <Text style={styles.creatorName}>{post.creatorNickname}</Text>
                  {post.creatorMannerTemperature !== undefined && post.creatorMannerTemperature !== null && (
                    <Text style={[styles.mannerTempText, { color: getTemperatureColor(post.creatorMannerTemperature) }]}>
                      🌡️ {post.creatorMannerTemperature}°C
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* 라운딩 일정 */}
          <View style={styles.detailItemRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={18} color="#2b8a3e" />
            </View>
            <View>
              <Text style={styles.itemLabel}>라운딩 일시</Text>
              <Text style={styles.itemValue}>{formatDate(post.playDateTime)}</Text>
            </View>
          </View>

          {/* 모집 현황 게이지바 */}
          <View style={styles.detailItemRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="people" size={18} color="#2b8a3e" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.playersLabelRow}>
                <Text style={styles.itemLabel}>모집 확정 인원 현황</Text>
                <Text style={styles.playersCountText}>
                  <Text style={styles.highlightCount}>{post.currentPlayers}</Text> / {post.maxPlayers} 명
                </Text>
              </View>

              {/* 프로그레스 게이지 */}
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
            </View>
          </View>

          {/* 게임비 정산 방식 */}
          <View style={styles.detailItemRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet" size={18} color="#2b8a3e" />
            </View>
            <View>
              <Text style={styles.itemLabel}>게임비 정산 방식</Text>
              <Text style={styles.itemValue}>{getPaymentTypeText(post.paymentType)}</Text>
            </View>
          </View>

          {isCreator && (
            <TouchableOpacity
              style={styles.creatorChatBtn}
              onPress={() => router.push({
                pathname: '/joins/chat',
                params: { joinPostId: post.id, title: post.title }
              })}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.creatorChatBtnText}>참여자들과 실시간 채팅하기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 상세 설명 및 매너 수칙 */}
        <View style={styles.card}>
          <Text style={styles.cardSubtitle}>상세 규칙 및 매너 수칙</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>
              {post.description || '작성된 상세 설명이 없습니다.'}
            </Text>
          </View>
        </View>

        {/* 개설자 전용: 신청 대기 목록 섹션 */}
        {isCreator && (
          <View style={styles.card}>
            <Text style={[styles.cardSubtitle, { marginBottom: 12 }]}>👥 조인 참가 신청 목록</Text>
            {applications.length === 0 ? (
              <Text style={styles.emptyAppsText}>아직 들어온 참가 신청이 없습니다.</Text>
            ) : (
              <View style={styles.appsList}>
                {applications.map((app) => (
                  <View key={app.id} style={styles.appItem}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedUserIdForModal(app.applicantId);
                        setProfileModalVisible(true);
                      }}
                      style={styles.appUserInfo}
                      activeOpacity={0.7}
                    >
                      {app.applicantProfileImageUrl ? (
                        <Image
                          source={{ uri: app.applicantProfileImageUrl.startsWith('http') ? app.applicantProfileImageUrl : `${API_BASE_URL}${app.applicantProfileImageUrl}` }}
                          style={styles.appAvatar}
                        />
                      ) : (
                        <View style={styles.appAvatarPlaceholder}>
                          <Ionicons name="person" size={14} color="#adb5bd" />
                        </View>
                      )}
                      <View style={styles.appUserMeta}>
                        <View style={styles.appUserNicknameRow}>
                          <Text style={styles.appUserNickname}>{app.applicantNickname}</Text>
                          <Text style={styles.appUserGender}>
                            ({app.applicantGender === 'MALE' ? '남성' : '여성'})
                          </Text>
                        </View>
                        <Text style={[styles.appUserMannerTemp, { color: getTemperatureColor(app.applicantMannerTemperature ?? 36.5) }]}>
                          🌡️ {app.applicantMannerTemperature ?? 36.5}°C
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {app.status === 'PENDING' ? (
                      <View style={styles.appActions}>
                        <TouchableOpacity
                          style={[styles.appBtn, styles.acceptBtn]}
                          onPress={() => handleAccept(app.id)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.appBtnText}>수락</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.appBtn, styles.rejectBtn]}
                          onPress={() => handleReject(app.id)}
                          disabled={actionLoading}
                        >
                          <Text style={styles.appBtnText}>거절</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[
                        styles.appStatusBadge,
                        app.status === 'ACCEPTED' ? { backgroundColor: '#e6fcf5' } : { backgroundColor: '#ffe3e3' }
                      ]}>
                        <Text style={[
                          styles.appStatusText,
                          app.status === 'ACCEPTED' ? { color: '#0ca678' } : { color: '#fa5252' }
                        ]}>
                          {app.status === 'ACCEPTED' ? '수락 완료' : '거절됨'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 하단 고정 플로팅 영역 */}
      <View style={[styles.bottomButtonContainer, { paddingBottom: Math.max(15, insets.bottom) }]}>
        {isCreator ? (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.deleteButton,
              actionLoading && styles.disabledBtn
            ]}
            onPress={handleDelete}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>⛳ 조인 삭제하기</Text>
              </>
            )}
          </TouchableOpacity>
        ) : isCancelled ? (
          <View style={[styles.actionButton, styles.disabledBtn]}>
            <Text style={styles.actionButtonText}>개설 취소된 조인 모집글입니다.</Text>
          </View>
        ) : isCompleted && (!myApplication || myApplication.status !== 'ACCEPTED') ? (
          <View style={[styles.actionButton, styles.disabledBtn]}>
            <Text style={styles.actionButtonText}>모집이 완료되었습니다.</Text>
          </View>
        ) : myApplication ? (
          myApplication.status === 'PENDING' ? (
            <View style={{ gap: 10, width: '100%' }}>
              <View style={[styles.actionButton, styles.pendingBtn]}>
                <Ionicons name="time-outline" size={20} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.actionButtonText}>⏳ 참여 승인 대기 중...</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.cancelButton,
                  actionLoading && styles.disabledBtn
                ]}
                onPress={handleLeave}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>참가 신청 취소하기</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : myApplication.status === 'ACCEPTED' ? (
            <View style={{ gap: 10, width: '100%' }}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptedStatusBtn]}
                onPress={() => router.push({
                  pathname: '/joins/chat',
                  params: { joinPostId: post.id, title: post.title }
                })}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles-outline" size={20} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.actionButtonText}>참여자 채팅방 입장</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.cancelButton,
                  actionLoading && styles.disabledBtn
                ]}
                onPress={handleLeave}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="exit-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>참가 취소하기</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.actionButton, styles.disabledBtn]}>
              <Ionicons name="close-circle-outline" size={20} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.actionButtonText}>❌ 참가 신청 거절됨</Text>
            </View>
          )
        ) : (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.applyButton,
              actionLoading && styles.disabledBtn
            ]}
            onPress={handleApply}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>⛳ 조인 참가 신청하기</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <UserProfileModal
        userId={selectedUserIdForModal}
        isVisible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
      <PortOneAuthWebView
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={handleAuthSuccess}
        onFailure={(msg) => {
          setAuthModalVisible(false);
          Alert.alert('본인인증 실패', msg);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
  },
  scrollContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 200,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  golfCenterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reservedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  reservedComplete: {
    backgroundColor: '#e6fcf5',
    borderColor: '#c3fae8',
  },
  reservedWait: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  reservedText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2b8a3e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  golfCenterName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginVertical: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#868e96',
    flex: 1,
  },
  kakaoMapButton: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#2b8a3e',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  kakaoMapButtonText: {
    color: '#2b8a3e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  callActionButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#2b8a3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledCallActionButton: {
    backgroundColor: '#adb5bd',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#e6fcf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0ca678',
  },
  joinTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 6,
  },
  creatorProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f3f5',
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  creatorLabel: {
    fontSize: 10,
    color: '#868e96',
    fontWeight: 'bold',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  mannerTempText: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e6fcf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 12,
    color: '#868e96',
    fontWeight: '600',
  },
  itemValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#495057',
    marginTop: 2,
  },
  playersLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playersCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  highlightCount: {
    color: '#2b8a3e',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2b8a3e',
    borderRadius: 4,
  },
  descriptionBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#f1f3f5',
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
  },
  emptyAppsText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    paddingVertical: 20,
  },
  appsList: {
    gap: 12,
    marginTop: 8,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
    paddingBottom: 12,
    paddingTop: 8,
  },
  appUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f3f5',
  },
  appAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appUserMeta: {
    justifyContent: 'center',
  },
  appUserNicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appUserNickname: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#343a40',
  },
  appUserGender: {
    fontSize: 12,
    color: '#868e96',
  },
  appUserMannerTemp: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  appActions: {
    flexDirection: 'row',
    gap: 8,
  },
  appBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#2b8a3e',
  },
  rejectBtn: {
    backgroundColor: '#fa5252',
  },
  appBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  appStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
  },
  actionButton: {
    flexDirection: 'row',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 4,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  applyButton: {
    backgroundColor: '#2b8a3e',
    shadowColor: '#2b8a3e',
  },
  pendingBtn: {
    backgroundColor: '#f59f00',
    shadowColor: '#f59f00',
  },
  acceptedStatusBtn: {
    backgroundColor: '#0ca678',
    shadowColor: '#0ca678',
  },
  disabledBtn: {
    backgroundColor: '#adb5bd',
    shadowColor: '#adb5bd',
  },
  deleteButton: {
    backgroundColor: '#fa5252',
    shadowColor: '#fa5252',
  },
  cancelButton: {
    backgroundColor: '#868e96',
    shadowColor: '#868e96',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  creatorChatBtn: {
    flexDirection: 'row',
    backgroundColor: '#2b8a3e',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  creatorChatBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reserveCompleteBtn: {
    flexDirection: 'row',
    backgroundColor: '#1b4d3e',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  reserveCompleteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
