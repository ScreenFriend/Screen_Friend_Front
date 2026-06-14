import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../api/client';
import { JoinPostResponse } from '../../api/types';
import JoinCard from '../../features/joins/components/JoinCard';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RegionFilterModal from '../../features/joins/components/RegionFilterModal';

export default function JoinsScreen() {
  const { user, setUser } = useAuth();
  const [posts, setPosts] = useState<JoinPostResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myDong, setMyDong] = useState<string | null>(null);
  const [selectedDong, setSelectedDong] = useState<string>('전체');
  const [customDongs, setCustomDongs] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [removedDongs, setRemovedDongs] = useState<string[]>([]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 1. 초기 조인 글 목록 로딩 (즉시 로드하여 렌더링 블로킹 해소)
  const loadInitialPosts = async () => {
    try {
      const allData = await apiService.getJoinPosts();
      setPosts(allData);
    } catch (e) {
      console.log('초기 조인 목록 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  // 2. 백그라운드 위치 및 동네 획득 (병렬 처리로 체감 속도 최적화)
  const fetchLocationInBackground = async () => {
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
      }
    } catch (err) {
      console.log('백그라운드 위치 조회 실패:', err);
    }
  };

  // 동네 필터 칩 목록 파생 계산 (Single Source of Truth)
  const dongList = React.useMemo(() => {
    const list = ['전체'];
    
    // 1. 내 동네 (myDong) 추가 (삭제되지 않았고 전체가 아닌 경우)
    if (myDong && myDong !== '전체' && !removedDongs.includes(myDong)) {
      list.push(myDong);
    }
    
    // 2. 검색/모달 등으로 수동 추가한 동네 (customDongs) 추가 (삭제되지 않은 경우)
    customDongs.forEach((d) => {
      if (!list.includes(d) && !removedDongs.includes(d)) {
        list.push(d);
      }
    });

    return list;
  }, [myDong, removedDongs, customDongs]);

  // user.removedDongs 전역 세션 변화 실시간 동기화 (깜빡임 완전 제거)
  useEffect(() => {
    if (user?.removedDongs) {
      setRemovedDongs(user.removedDongs);
      console.log('[joins.tsx] 유저 세션의 삭제 동네 목록 동기화:', user.removedDongs);
    } else {
      setRemovedDongs([]);
    }
  }, [user?.removedDongs]);

  // 컴포넌트 마운트 및 유저 세션 초기화 시 데이터 로드
  useEffect(() => {
    const initData = async () => {
      await loadInitialPosts();
      await fetchLocationInBackground();
    };
    initData();
  }, [user?.id]);

  const fetchPosts = async (dongName: string) => {
    setLoading(true);
    try {
      const targetDong = dongName === '전체' ? undefined : dongName;
      const data = await apiService.getJoinPosts(targetDong);
      setPosts(data);
    } catch (e) {
      console.log('조인글 필터 조회 실패:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // 새로고침 시 최신 유저 세션을 불러와 삭제 동네 동기화
      if (user) {
        try {
          const freshUser = await apiService.getUserProfile(user.id);
          setUser(freshUser);
        } catch (userErr) {
          console.log('새로고침 중 유저 정보 동기화 실패:', userErr);
        }
      }

      const targetDong = selectedDong === '전체' ? undefined : selectedDong;
      const filtered = await apiService.getJoinPosts(targetDong);
      setPosts(filtered);
    } catch (e) {
      console.log('새로고침 중 오류:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDongSelect = (dongName: string) => {
    setSelectedDong(dongName);
    fetchPosts(dongName);
  };

  const handleSearchSubmit = () => {
    let query = searchQuery.trim();
    if (!query) return;

    if (!query.endsWith('동') && !query.endsWith('읍') && !query.endsWith('면')) {
      query += '동';
    }

    setCustomDongs((prev) => {
      if (prev.includes(query)) return prev;
      return [...prev, query];
    });

    setSelectedDong(query);
    fetchPosts(query);
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleSelectDongFromModal = (dongName: string) => {
    setSelectedDong(dongName);
    fetchPosts(dongName);
    setCustomDongs((prev) => {
      if (prev.includes(dongName)) return prev;
      return [...prev, dongName];
    });
  };



  const handleRemoveDong = async (dongName: string) => {
    console.log('[handleRemoveDong] 삭제 요청 동네:', dongName);
    if (selectedDong === dongName) {
      setSelectedDong('전체');
      fetchPosts('전체');
    }
    
    // 1. 즉각적인 UI 반영을 위해 removedDongs 상태 업데이트
    setRemovedDongs((prev) => {
      if (prev.includes(dongName)) return prev;
      return [...prev, dongName];
    });

    try {
      // 2. 서버 DB 반영 및 전역 세션 동기화
      const updatedUser = await apiService.addRemovedDong(dongName);
      setUser(updatedUser);
      console.log('[handleRemoveDong] 서버 동기화 완료:', updatedUser.removedDongs);
    } catch (e) {
      console.log('삭제 동네 서버 동기화 에러:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* 탭바 맞춤 상단 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>⛳ 조인 모집 목록</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setRegionModalVisible(true)}
            style={styles.regionFilterBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="location" size={20} color="#2b8a3e" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSearch(!showSearch)}
            style={styles.searchToggleBtn}
          >
            <Ionicons name={showSearch ? "close" : "search"} size={20} color="#495057" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/joins/create')}
            style={styles.createBtn}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>개설하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 검색 바 */}
      {showSearch && (
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="찾고 싶은 동네를 입력하세요 (예: 장안동)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus
          />
          <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchSubmitBtn}>
            <Text style={styles.searchSubmitBtnText}>검색</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 동네 카테고리 필터 바 */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >

          {dongList.map((dong) => {
            const isSelected = selectedDong === dong;
            const isMyLocation = myDong === dong && dong !== '전체';

            return (
              <TouchableOpacity
                key={dong}
                onPress={() => handleDongSelect(dong)}
                style={[
                  styles.filterChip,
                  isSelected && styles.selectedChip,
                  isMyLocation && !isSelected && styles.myLocationChip
                ]}
              >
                {isMyLocation && (
                  <Ionicons
                    name="location"
                    size={12}
                    color={isSelected ? '#fff' : '#2b8a3e'}
                    style={{ marginRight: 3 }}
                  />
                )}
                <Text style={[
                  styles.chipText,
                  isSelected && styles.selectedChipText,
                  isMyLocation && !isSelected && styles.myLocationChipText
                ]}>
                  {dong === '전체' ? '🌐 전체' : isMyLocation ? `${dong} (내동네)` : dong}
                </Text>
                {dong !== '전체' && dong !== myDong && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveDong(dong);
                    }}
                    style={styles.deleteChipBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="close-circle"
                      size={14}
                      color={isSelected ? '#fff' : '#868e96'}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => <JoinCard item={item} />}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(100, insets.bottom + 20) }
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2b8a3e']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>선택한 동네에 모집 중인 조인글이 없습니다.</Text>
              <Text style={styles.emptySubText}>개설하기를 눌러 첫 번째 모집글을 작성해 보세요!</Text>
            </View>
          }
        />
      )}
      <RegionFilterModal
        isVisible={regionModalVisible}
        onClose={() => setRegionModalVisible(false)}
        onSelectDong={handleSelectDongFromModal}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  regionFilterBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#e6fcf5',
    borderWidth: 1,
    borderColor: '#c3fae8',
  },
  searchToggleBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#212529',
  },
  searchSubmitBtn: {
    backgroundColor: '#2b8a3e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchSubmitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2b8a3e',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  createBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterBarContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingVertical: 10,
  },
  filterScrollContent: {
    paddingHorizontal: 15,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedChip: {
    backgroundColor: '#2b8a3e',
    borderColor: '#2b8a3e',
  },
  myLocationChip: {
    borderColor: '#2b8a3e',
    backgroundColor: '#e6fcf5',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  selectedChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteChipBtn: {
    marginLeft: 6,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myLocationChipText: {
    color: '#2b8a3e',
    fontWeight: 'bold',
  },

  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 15,
    color: '#868e96',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
  },
});

