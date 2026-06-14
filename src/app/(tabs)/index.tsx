import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../api/client';
import { JoinPostResponse, UserStatsResponse } from '../../api/types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setStats as setStatsAction } from '../../store/authSlice';

export default function HomeScreen() {
  const { user } = useAuth();
  const [recentPosts, setRecentPosts] = useState<JoinPostResponse[]>([]);
  const [myDong, setMyDong] = useState<string | null>(null);
  const stats = useSelector((state: RootState) => state.auth.stats);
  const dispatch = useDispatch();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const GOLF_TIPS = [
    {
      title: "드라이버 비거리를 늘리는 슬라이스 교정법",
      desc: "어드레스 시 골반을 살짝 타겟 오른쪽으로 돌려주고, 다운스윙 시 아웃-인 궤도가 아닌 인-아웃 궤도로 던져주듯 릴리즈해야 강한 드로우 성 구질을 만들 수 있습니다."
    },
    {
      title: "스크린 골프 퍼팅 성공률 높이는 꿀팁",
      desc: "스크린 골프에서는 보통 1컵이 1미터당 약 5~8cm 정도 꺾이는 것을 기준 삼습니다. 공의 속도가 떨어지는 막판에 더 많이 휘어지므로 내리막 경사에서는 안내된 컵수보다 조금 더 여유 있게(넓게) 에이밍을 해주어야 성공률이 올라갑니다."
    },
    {
      title: "아이언 샷 뒷땅 방지를 위한 핸드 퍼스트",
      desc: "뒷땅이 자주 발생한다면 임팩트 순간 손이 클럽 헤드보다 앞서 나가는 '핸드 퍼스트' 자세를 점검하세요. 셋업 시 손의 위치를 허벅지 안쪽에 두고 체중을 왼발에 60% 실어준 뒤 타격하면 깔끔한 임팩트가 나옵니다."
    },
    {
      title: "티샷 전 긴장 완화를 위한 일정한 샷 루틴",
      desc: "티잉 구역에 서서 급하게 스윙하면 템포가 무너지기 쉽습니다. 셋업 전 뒤에서 타겟을 보며 균일한 속도로 빈스윙을 2회 진행하고, 내 스윙 템포(하나~둘~셋)를 마음속으로 외치며 일관되게 휘두르는 루틴을 체득해 보세요."
    },
    {
      title: "스크린 골프 어프로치 거리 조절법",
      desc: "30m 이하의 어프로치는 손목 코킹을 자제하고 어깨 오각형을 유지해 시계추 스윙을 하세요. 내 백스윙 기준선(예: 무릎 높이 10m, 허리 높이 20m, 가슴 높이 30m)을 만들면 핀 근처에 붙이기가 극도로 수월해집니다."
    },
    {
      title: "우드/유틸리티 샷을 쓸어치는 요령",
      desc: "우드와 유틸리티는 아이언처럼 찍어치기보단 잔디 위를 빗자루로 쓸어내듯 완만하게 스윙해야 탑볼을 면합니다. 볼 위치는 왼발 뒤꿈치 안쪽에 두고 머리 축을 끝까지 고정한 채 부드럽게 회전해 보세요."
    },
    {
      title: "벙커 탈출을 위한 모래 폭파 샷",
      desc: "벙커 샷은 클럽 페이스를 과감히 열어 바운스(헤드 밑바닥)로 쳐야 모래에 박히지 않습니다. 공 뒤 2~3cm 지점의 모래를 강하게 쳐내며 모래와 함께 공을 떠올린다는 기분으로 끝까지 피니시를 넘겨주어야 합니다."
    }
  ];

  const today = new Date();
  const dateIndex = (today.getFullYear() + today.getMonth() + today.getDate()) % GOLF_TIPS.length;
  const dailyTip = GOLF_TIPS[dateIndex];

  const getTemperatureColor = (temp: number) => {
    if (temp >= 37.5) return '#2b8a3e';
    if (temp >= 36.5) return '#e8590c';
    return '#1c7ed6';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const rawHours = d.getHours();
      const ampm = rawHours >= 12 ? '오후' : '오전';
      let hours = rawHours % 12;
      hours = hours ? hours : 12;
      return `${d.getMonth() + 1}월 ${d.getDate()}일 ${ampm} ${hours}시`;
    } catch (e) {
      return dateStr;
    }
  };

  const [weather, setWeather] = useState<{
    temp: number;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    advice: string;
  }>({
    temp: 24,
    description: '맑음',
    icon: 'sunny',
    advice: '"실내 스크린 골프하기 딱 좋은 온도입니다!"',
  });

  const fetchWeather = async (lat: number, lon: number) => {
    const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    console.log('[Weather] 현재 로드된 API Key:', apiKey);
    
    if (!apiKey || apiKey === 'your_openweathermap_api_key_here') {
      console.log('[Weather] 유효한 API Key가 없어 더미(폴백) 날씨 데이터를 노출합니다.');
      return;
    }

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`
      );
      
      if (!response.ok) {
        console.warn(`[Weather] API 요청 실패 (상태코드: ${response.status}) - 아직 키가 활성화되지 않았거나 잘못되었습니다.`);
        return;
      }

      const data = await response.json();
      if (data && data.main && data.weather && data.weather[0]) {
        const temp = Math.round(data.main.temp);
        const desc = data.weather[0].description;
        const mainWeather = data.weather[0].main.toLowerCase();
        
        let icon: keyof typeof Ionicons.glyphMap = 'sunny';
        let advice = '"실내 스크린 골프하기 딱 좋은 온도입니다!"';

        if (mainWeather.includes('rain') || mainWeather.includes('drizzle')) {
          icon = 'rainy';
          advice = '"비 오는 날엔 시원하고 쾌적한 실내 스크린 골프가 정답! ☔"';
        } else if (mainWeather.includes('snow')) {
          icon = 'snow';
          advice = '"눈 오는 날에는 따뜻한 스크린 골프장에서 손맛을! ☃️"';
        } else if (mainWeather.includes('cloud')) {
          icon = 'cloudy';
          advice = '"흐린 날씨, 필드 대신 스크린에서 나만의 스윙을 해보세요!"';
        } else if (mainWeather.includes('clear')) {
          icon = 'sunny';
          advice = '"날씨가 너무 화창하지만 필드 예약이 없다면 스크린으로! 🏌️‍♂️"';
        } else {
          icon = 'partly-sunny';
          advice = '"변덕스러운 날씨, 안전한 스크린 골프에서 한 판 어떠신가요?"';
        }

        setWeather({
          temp,
          description: desc,
          icon,
          advice,
        });
      }
    } catch (error) {
      console.log('날씨 API 조회 오류:', error);
    }
  };

  useEffect(() => {
    const getMyLocationAndDong = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const dong = await apiService.getRegionDong(loc.coords.latitude, loc.coords.longitude);
          if (dong && dong !== '기타') {
            setMyDong(dong);
          }
          fetchWeather(loc.coords.latitude, loc.coords.longitude);
        }
      } catch (e) {
        console.log('위치 및 동네 조회 실패:', e);
      }
    };
    getMyLocationAndDong();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchRecent = async () => {
        try {
          const posts = await apiService.getJoinPosts(myDong || undefined);
          setRecentPosts(posts.slice(0, 2));
        } catch (e) {
          console.log('최신 글 가져오기 실패:', e);
        }
      };

      const fetchStats = async () => {
        try {
          const data = await apiService.getMyStats();
          dispatch(setStatsAction(data));
        } catch (e) {
          console.log('통계 데이터 로드 실패:', e);
        }
      };

      fetchRecent();
      fetchStats();
    }, [dispatch, myDong])
  );


  const navigateToJoins = () => {
    router.push('/(tabs)/joins');
  };

  const navigateToJoinDetail = (id: number) => {
    router.push(`/joins/${id}`);
  };

  const navigateToManage = () => {
    router.push('/(tabs)/manage-joins');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(110, insets.bottom + 20),
        }
      ]}
    >
      {/* 웰컴 그라데이션 배너 */}
      <View style={styles.headerBanner}>
        <View style={styles.headerInfo}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{user?.nickname || '회원'}님 🏌️‍♂️</Text>
          </View>
          <Text style={styles.tagline}>오늘도 스크린 한 판 어떠신가요?</Text>
        </View>
        <View style={styles.ballGraphic1} />
        <View style={styles.ballGraphic2} />
      </View>

      {/* 날씨/라운딩 팁 위젯 */}
      <View style={styles.weatherWidget}>
        <Ionicons 
          name={weather.icon} 
          size={26} 
          color={weather.icon === 'sunny' ? '#e5a93b' : weather.icon === 'cloudy' ? '#868e96' : '#1c7ed6'} 
        />
        <View style={styles.weatherTextInfo}>
          <Text style={styles.weatherStatus}>현재 날씨 {weather.description} ({weather.temp}°C)</Text>
          <Text style={styles.weatherAdvice}>{weather.advice}</Text>
        </View>
      </View>

      {/* 내 스탯 카드 */}
      <Text style={styles.sectionTitle}>내 스탯 대시보드</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>
            {stats ? `${stats.pendingJoinsCount}건` : '0건'}
          </Text>
          <Text style={styles.statLabel}>대기 중인 조인</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>
            {user?.averageScore !== undefined && user?.averageScore !== null ? `${user.averageScore}타` : '미공개'}
          </Text>
          <Text style={styles.statLabel}>평균 타수</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: getTemperatureColor(user?.mannerTemperature || 36.5) }]}>
            {user?.mannerTemperature !== undefined && user?.mannerTemperature !== null ? `${user.mannerTemperature}°C` : '36.5°C'}
          </Text>
          <Text style={styles.statLabel}>내 매너 온도</Text>
        </View>
      </View>

      {/* 2단 퀵 링크 카드 메뉴 */}
      <View style={styles.quickMenuRow}>
        <TouchableOpacity 
          onPress={navigateToJoins} 
          style={[styles.quickCard, styles.joinsCard]}
          activeOpacity={0.85}
        >
          <View style={styles.quickCardHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="golf" size={20} color="#2b8a3e" />
            </View>
            <Ionicons name="arrow-forward-circle" size={22} color="#fff" style={styles.cardArrow} />
          </View>
          <Text style={styles.quickCardTitle}>조인 모집</Text>
          <Text style={styles.quickCardDesc}>다양한 모집글을{"\n"}탐색하고 참가하기</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={navigateToManage} 
          style={[styles.quickCard, styles.manageCard]}
          activeOpacity={0.85}
        >
          <View style={styles.quickCardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#fff2e6' }]}>
              <Ionicons name="calendar" size={20} color="#e8590c" />
            </View>
            <Ionicons name="arrow-forward-circle" size={22} color="#fff" style={styles.cardArrow} />
          </View>
          <Text style={styles.quickCardTitle}>조인 관리</Text>
          <Text style={styles.quickCardDesc}>신청한 내역과{"\n"}개설한 조인 확인</Text>
        </TouchableOpacity>
      </View>

      {/* 최신 등록 조인글 목록 */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {myDong ? `실시간 우리 동네 조인 (${myDong}) 🏠` : '실시간 우리 동네 조인 🏠'}
          </Text>
          <TouchableOpacity onPress={navigateToJoins}>
            <Text style={styles.seeAllText}>전체보기</Text>
          </TouchableOpacity>
        </View>

        {recentPosts.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>우리 동네에 모집 중인 조인이 없습니다.</Text>
          </View>
        ) : (
          recentPosts.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => navigateToJoinDetail(item.id)} style={styles.miniCard}>
              <View style={styles.miniCardLeft}>
                <View style={styles.miniCardHeaderRow}>
                  {item.dong && <Text style={styles.miniDongBadge}>[{item.dong}]</Text>}
                  <Text style={styles.miniCardSub} numberOfLines={1}>{item.golfCenterName}</Text>
                </View>
                <Text style={styles.miniCardTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.miniCardInfoRow}>
                  <Text style={styles.miniCardInfoText}>📅 {formatDate(item.playDateTime)}</Text>
                  {item.creatorNickname && (
                    <Text style={styles.miniCardInfoText}>👤 {item.creatorNickname}</Text>
                  )}
                </View>
              </View>
              <View style={styles.miniCardRight}>
                <Text style={styles.miniCardPlayers}>{item.currentPlayers}/{item.maxPlayers} 명</Text>
                <View style={[
                  styles.miniReservedBadge,
                  item.isReserved ? styles.miniReservedComplete : styles.miniReservedWait
                ]}>
                  <Text style={[
                    styles.miniReservedText,
                    item.isReserved ? { color: '#2b8a3e' } : { color: '#868e96' }
                  ]}>
                    {item.isReserved ? '예약완료' : '예약대기'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* 골프 팁 섹션 */}
      <Text style={styles.sectionTitle}>오늘의 원포인트 팁 💡</Text>
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>{dailyTip.title}</Text>
        <Text style={styles.tipDesc}>{dailyTip.desc}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f9',
  },
  content: {
    padding: 20,
    paddingBottom: 110, // 하단 플로팅 탭바 여백 확보
  },
  headerBanner: {
    height: 140,
    backgroundColor: '#1b4d3e',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerInfo: {
    zIndex: 2,
  },
  welcomeText: {
    fontSize: 13,
    color: '#a3bfa8',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  mannerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  mannerBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tagline: {
    fontSize: 12,
    color: '#d1e7dd',
    marginTop: 8,
  },
  ballGraphic1: {
    position: 'absolute',
    right: -20,
    bottom: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ballGraphic2: {
    position: 'absolute',
    right: 40,
    top: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  weatherWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eef2f3',
  },
  weatherTextInfo: {
    marginLeft: 12,
    flex: 1,
  },
  weatherStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#343a40',
  },
  weatherAdvice: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef2f3',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  statNum: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2b8a3e',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  quickMenuRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  quickCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    elevation: 6,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  joinsCard: {
    backgroundColor: '#1b4d3e',
    shadowColor: '#1b4d3e',
  },
  manageCard: {
    backgroundColor: '#2a3a30',
    shadowColor: '#2a3a30',
  },
  quickCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e6f4ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardArrow: {
    opacity: 0.85,
  },
  quickCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  quickCardDesc: {
    fontSize: 11,
    color: '#c2dbd1',
    lineHeight: 15,
  },
  recentSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 13,
    color: '#2b8a3e',
    fontWeight: 'bold',
  },
  emptyRecent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eef2f3',
  },
  emptyRecentText: {
    color: '#adb5bd',
    fontSize: 13,
  },
  miniCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eef2f3',
  },
  miniCardLeft: {
    flex: 1,
    marginRight: 10,
  },
  miniCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  miniDongBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2b8a3e',
  },
  miniCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#343a40',
    marginTop: 2,
  },
  miniCardSub: {
    fontSize: 11,
    color: '#868e96',
    flex: 1,
  },
  miniCardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  miniCardInfoText: {
    fontSize: 11,
    color: '#868e96',
  },
  miniCardRight: {
    alignItems: 'flex-end',
  },
  miniCardPlayers: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2b8a3e',
  },
  miniReservedBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 4,
  },
  miniReservedComplete: {
    backgroundColor: '#e6fcf5',
    borderColor: '#c3fae8',
  },
  miniReservedWait: {
    backgroundColor: '#f8f9fa',
    borderColor: '#e9ecef',
  },
  miniReservedText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef2f3',
    marginBottom: 15,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 6,
  },
  tipDesc: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 18,
  },
});
