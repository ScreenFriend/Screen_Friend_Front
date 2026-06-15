import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Dimensions, Platform, Linking, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiService } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import PortOneAuthWebView from '../../features/auth/components/PortOneAuthWebView';

const { width, height } = Dimensions.get('window');

interface GolfCenter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
}

export default function CreateJoinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 위치 및 지도 상태
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const currentRegionRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [searching, setSearching] = useState(false);
  const [centers, setCenters] = useState<GolfCenter[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<GolfCenter | null>(null);

  // 등록 스텝 (0: 지도 및 골프장 선택, 1: 상세 정보 입력)
  const [step, setStep] = useState<number>(0);

  // 본인인증 관련
  const { isPhoneVerified, user, checkLogin } = useAuth();
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

  // 폼 입력 상태
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<number>(4); // 기본 4명
  const [isReserved, setIsReserved] = useState<boolean>(false);
  const [paymentType, setPaymentType] = useState<'DUTCH_PAY' | 'HOST_PAYS' | 'OTHER'>('DUTCH_PAY');

  // 날짜/시간 상태
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // API 호출 로딩 상태
  const [submitting, setSubmitting] = useState(false);

  // 1. 현재 사용자 내 위치 획득 및 실제 주변 스크린 골프장 탐색
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('위치 권한 필요', '내 주변 골프장 조회를 위해 위치 권한 허용이 필요합니다. 기본 위치로 표시합니다.');
          const fallback = { latitude: 37.4979, longitude: 127.0276 };
          setMyLocation(fallback);
          currentRegionRef.current = fallback;

          try {
            const data = await apiService.searchScreenGolf(fallback.latitude, fallback.longitude);
            if (data && data.length > 0) {
              setCenters(data);
            } else {
              setCenters([]);
            }
          } catch (e) {
            setCenters([]);
          }
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const current = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setMyLocation(current);
        currentRegionRef.current = current;

        // 실제 카카오 맵 API 기반 실시간 검색 API 호출
        try {
          console.log('[CreateJoinScreen] 실제 스크린 골프장 검색 API 호출 중...', current);
          const data = await apiService.searchScreenGolf(current.latitude, current.longitude);
          if (data && data.length > 0) {
            setCenters(data);
          } else {
            console.log('[CreateJoinScreen] 실제 검색 결과가 없습니다.');
            setCenters([]);
          }
        } catch (placeErr) {
          console.log('[CreateJoinScreen] 실제 장소 검색 API 호출 실패:', placeErr);
          setCenters([]);
        }

      } catch (error) {
        console.log('위치 획득 실패:', error);
        const fallback = { latitude: 37.4979, longitude: 127.0276 };
        setMyLocation(fallback);
        currentRegionRef.current = fallback;
        setCenters([]);
      } finally {
        setLoadingLocation(false);
      }
    };

    fetchLocation();
  }, []);

  // 2. 지도 중심 기준으로 주변 5km 반경의 실제 스크린 골프장 재검색
  const handleSearchAtCurrentRegion = async () => {
    const targetRegion = currentRegionRef.current;
    if (!targetRegion) return;

    setSearching(true);
    setSelectedCenter(null); // 새로운 검색 시 기존 선택값 리셋
    try {
      console.log('[CreateJoinScreen] 현재 지도 중심 좌표로 재검색 중...', targetRegion);
      const data = await apiService.searchScreenGolf(targetRegion.latitude, targetRegion.longitude);
      if (data && data.length > 0) {
        setCenters(data);
      } else {
        setCenters([]);
        Alert.alert('검색 결과 없음', '이 위치 주변 5km 반경 내에 등록된 스크린 골프장이 없습니다.');
      }
    } catch (placeErr) {
      console.log('[CreateJoinScreen] 재검색 API 호출 실패:', placeErr);
      setCenters([]);
      Alert.alert('검색 실패', '주변 골프장 검색 도중 오류가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  };

  // 날짜 변경 핸들러
  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const current = new Date(date);
      current.setFullYear(selectedDate.getFullYear());
      current.setMonth(selectedDate.getMonth());
      current.setDate(selectedDate.getDate());
      setDate(current);
    }
  };

  // 시간 변경 핸들러
  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const current = new Date(date);
      current.setHours(selectedTime.getHours());
      current.setMinutes(selectedTime.getMinutes());
      current.setSeconds(0);
      setDate(current);
    }
  };

  // 조인 개설 등록 전송
  const handleSubmit = async () => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    if (date.getTime() < tenMinutesLater.getTime()) {
      Alert.alert('예약 시간 오류', '조인 예약 시간은 현재 시간으로부터 최소 10분 이후로만 설정할 수 있습니다.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('알림', '조인 모집글의 제목을 입력해 주세요.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('알림', '조인 상세 설명 또는 골프 매너에 대해 작성해 주세요.');
      return;
    }
    if (!selectedCenter) {
      Alert.alert('오류', '선택된 스크린 골프장 정보가 없습니다.');
      return;
    }

    setSubmitting(true);
    try {
      // ISO-8601 LocalDateTime 호환 규격 포맷팅 (YYYY-MM-DDTHH:mm:ss)
      const offset = date.getTimezoneOffset() * 60000;
      const localISODate = new Date(date.getTime() - offset).toISOString().slice(0, 19);

      await apiService.createJoinPost({
        title: title.trim(),
        golfCenterName: selectedCenter.name,
        playDateTime: localISODate,
        maxPlayers,
        currentPlayers: 1, // 개설자 본인 포함 1명으로 시작
        description: description.trim(),
        address: selectedCenter.address,
        isReserved,
        paymentType,
        phone: selectedCenter.phone,
      });

      Alert.alert('개설 성공', '⛳ 새로운 스크린 골프 조인 모집글이 개설되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            router.replace('/(tabs)/joins');
          },
        },
      ]);
    } catch (e: any) {
      console.log('조인 개설 에러:', e);
      Alert.alert('개설 실패', e.response?.data?.message || '조인 개설 진행 중 서버 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  const formattedTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  if (loadingLocation || !myLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b8a3e" />
        <Text style={styles.loadingText}>현재 위치 및 주변 골프장을 로딩 중입니다...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 커스텀 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (step === 1 ? setStep(0) : router.back())} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#343a40" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 0 ? '⛳ 스크린 골프장 선택' : '📝 조인 세부 정보 작성'}
        </Text>
        <View style={styles.emptyHeaderCell} />
      </View>

      {step === 0 ? (
        // 스텝 0: 지도 화면 및 골프장 마커 선택
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{
              latitude: myLocation.latitude,
              longitude: myLocation.longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
            showsUserLocation={true}
            onRegionChangeComplete={(region) => {
              currentRegionRef.current = {
                latitude: region.latitude,
                longitude: region.longitude,
              };
            }}
          >
            {centers.map((center) => (
              <Marker
                key={`${center.id}-${selectedCenter?.id === center.id ? 'selected' : 'normal'}`}
                coordinate={{ latitude: center.latitude, longitude: center.longitude }}
                onPress={() => setSelectedCenter(center)}
                zIndex={selectedCenter?.id === center.id ? 999 : 1}
                pinColor={selectedCenter?.id === center.id ? '#1b4d3e' : '#2b8a3e'}
              />
            ))}
          </MapView>

          {/* 이 위치에서 재검색 플로팅 버튼 */}
          <TouchableOpacity
            style={styles.searchHereButton}
            onPress={handleSearchAtCurrentRegion}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
            ) : (
              <Ionicons name="refresh-outline" size={16} color="#fff" />
            )}
            <Text style={styles.searchHereButtonText}>
              {searching ? '검색 중...' : '이 위치에서 재검색'}
            </Text>
          </TouchableOpacity>

          {/* 하단 골프장 요약 및 스텝 진행 카드 */}
          <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 15 }]}>
            {selectedCenter ? (
              <View>
                <Text style={styles.cardSubtitle}>선택된 스크린 골프장</Text>
                <Text style={styles.cardTitle}>{selectedCenter.name}</Text>

                {/* 주소 정보 연동 */}
                <View style={[styles.addressRow, { marginBottom: 6 }]}>
                  <Ionicons name="location-outline" size={14} color="#868e96" />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {selectedCenter.address || '주소 정보 없음'}
                  </Text>
                </View>

                {/* 전화번호 정보 연동 */}
                <View style={[styles.addressRow, { marginTop: 0, marginBottom: 16 }]}>
                  <Ionicons name="call-outline" size={14} color="#868e96" />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {selectedCenter.phone || '등록된 연락처가 없습니다.'}
                  </Text>
                </View>

                <View style={styles.cardActionsContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      if (selectedCenter.phone) {
                        Linking.openURL(`tel:${selectedCenter.phone}`).catch(() =>
                          Alert.alert('오류', '전화 앱을 열 수 없습니다.')
                        );
                      }
                    }}
                    style={[
                      styles.callButton,
                      !selectedCenter.phone && styles.disabledCallButton
                    ]}
                    disabled={!selectedCenter.phone}
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      const url = `https://place.map.kakao.com/${selectedCenter.id}`;
                      Linking.openURL(url).catch(() => Alert.alert('링크 오류', '카카오맵 정보 페이지를 열 수 없습니다.'));
                    }}
                    style={styles.kakaoMapButton}
                  >
                    <Ionicons name="map-outline" size={15} color="#2b8a3e" style={{ marginRight: 4 }} />
                    <Text style={styles.kakaoMapButtonText}>카카오맵 평점/리뷰</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      if (!isPhoneVerified) {
                        Alert.alert(
                          '본인인증 필요',
                          '조인 개설을 위해 최초 1회 휴대폰 본인인증이 필요합니다.',
                          [
                            { text: '취소', style: 'cancel' },
                            { text: '인증하기', onPress: () => setAuthModalVisible(true) }
                          ]
                        );
                        return;
                      }
                      setStep(1);
                    }}
                    style={styles.nextButton}
                  >
                    <Text style={styles.nextButtonText}>이 지점으로 조인 개설</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noSelectionContainer}>
                <Ionicons name="location-outline" size={36} color="#adb5bd" />
                <Text style={styles.noSelectionText}>
                  지도의 ⛳ 마커를 클릭하여 조인을 개설할 스크린 골프장을 선택해 주세요.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        // 스텝 1: 조인 세부 정보 입력 폼
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingBottom: insets.bottom + 40 }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 선택 골프장 요약 */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>개설 지점</Text>
            <Text style={styles.summaryValue}>{selectedCenter?.name}</Text>
          </View>

          {/* 제목 입력 */}
          <Text style={styles.label}>조인 제목</Text>
          <TextInput
            style={styles.input}
            placeholder="예) 퇴근 후 스크린 골프 한판 치실 분 구합니다!"
            value={title}
            onChangeText={setTitle}
            maxLength={40}
          />

          {/* 일정 선택 */}
          <Text style={styles.label}>라운딩 일정 (날짜 및 시간)</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateTimeButton}
            >
              <Ionicons name="calendar-outline" size={18} color="#2b8a3e" />
              <Text style={styles.dateTimeText}>{formattedDate}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={styles.dateTimeButton}
            >
              <Ionicons name="time-outline" size={18} color="#2b8a3e" />
              <Text style={styles.dateTimeText}>{formattedTime}</Text>
            </TouchableOpacity>
          </View>

          {/* DateTimePicker 모달 (iOS/Android 분기 렌더링) */}
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          {/* 모집 인원수 조절 (최대 2명 ~ 16명) */}
          <Text style={styles.label}>모집 인원 (최대 2명 ~ 16명)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playerSelectionScroll}
            style={{ marginBottom: 25 }}
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((num) => (
              <TouchableOpacity
                key={num}
                onPress={() => setMaxPlayers(num)}
                style={[
                  styles.playerButton,
                  maxPlayers === num && styles.selectedPlayerButton
                ]}
              >
                <Text style={[
                  styles.playerButtonText,
                  maxPlayers === num && styles.selectedPlayerButtonText
                ]}>
                  {num}명
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 골프장 예약 여부 선택 (라디오 버튼) */}
          <Text style={styles.label}>골프장 예약 완료 여부</Text>
          <View style={styles.reservationSelectionRow}>
            {[
              { label: '예약 완료 ⛳', value: true },
              { label: '예약 전 (대기) ⏳', value: false }
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => setIsReserved(item.value)}
                style={[
                  styles.reservationButton,
                  isReserved === item.value && styles.selectedReservationButton
                ]}
              >
                <Text style={[
                  styles.reservationButtonText,
                  isReserved === item.value && styles.selectedReservationButtonText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 게임비 정산 방식 선택 (라디오 버튼) */}
          <Text style={styles.label}>게임비 정산 방식</Text>
          <View style={styles.reservationSelectionRow}>
            {[
              { label: '더치페이 💸', value: 'DUTCH_PAY' as const },
              { label: '방장 부담 🤲', value: 'HOST_PAYS' as const },
              { label: '직접 협의 💬', value: 'OTHER' as const }
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                onPress={() => setPaymentType(item.value)}
                style={[
                  styles.reservationButton,
                  paymentType === item.value && styles.selectedReservationButton
                ]}
              >
                <Text style={[
                  styles.reservationButtonText,
                  paymentType === item.value && styles.selectedReservationButtonText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 상세 설명 */}
          <Text style={styles.label}>상세 설명 및 매너 수칙</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="티업 시간 엄수, 선호 타수(백돌이/싱글 등), 게임비 내기 방식 등 상세 규칙을 써주세요."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* 최종 개설하기 버튼 */}
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.submitButtonText}>⛳ 스크린 골프 조인 개설 완료</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
      </View>
      <PortOneAuthWebView
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSuccess={handleAuthSuccess}
        onFailure={(msg) => {
          setAuthModalVisible(false);
          Alert.alert('본인인증 실패', msg);
        }}
      />
    </KeyboardAvoidingView>
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
    padding: 30,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 17,
    fontWeight: 'bold',
    color: '#343a40',
  },
  emptyHeaderCell: {
    width: 34,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: height - 56 - 180, // 헤더와 하단 카드를 제외한 영역 차지
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -5 },
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2b8a3e',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
    gap: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#868e96',
    flex: 1,
  },
  cardActionsContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  kakaoMapButton: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#2b8a3e',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  kakaoMapButtonText: {
    color: '#2b8a3e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1.3,
    flexDirection: 'row',
    backgroundColor: '#2b8a3e',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noSelectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  noSelectionText: {
    fontSize: 14,
    color: '#868e96',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  scrollContainer: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#868e96',
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2b8a3e',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    height: 48,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    marginBottom: 20,
    color: '#212529',
  },
  textArea: {
    height: 110,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 15,
    gap: 8,
  },
  dateTimeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  playerSelectionScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  playerButton: {
    width: 60,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  selectedPlayerButton: {
    backgroundColor: '#2b8a3e',
    borderColor: '#2b8a3e',
  },
  playerButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#495057',
  },
  selectedPlayerButtonText: {
    color: '#fff',
  },
  reservationSelectionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  reservationButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedReservationButton: {
    backgroundColor: '#2b8a3e',
    borderColor: '#2b8a3e',
  },
  reservationButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  selectedReservationButtonText: {
    color: '#fff',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#2b8a3e',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    elevation: 4,
    shadowColor: '#2b8a3e',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchHereButton: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b8a3e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    gap: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  searchHereButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  callButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#2b8a3e', // 메인 테마색상 초록색과 맞춤
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledCallButton: {
    backgroundColor: '#adb5bd',
  },
});
