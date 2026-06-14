import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { apiService } from '../../../api/client';
import { JoinPostResponse } from '../../../api/types';
import JoinCard from './JoinCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MannerReviewModal from './MannerReviewModal';

export default function MyCompletedList() {
  const [posts, setPosts] = useState<JoinPostResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  const fetchPosts = async () => {
    try {
      const data = await apiService.getMyCompletedJoins();
      setPosts(data);
    } catch (e) {
      console.log('종료된 조인 로딩 에러:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleReviewPress = (postId: number) => {
    setSelectedPostId(postId);
    setReviewModalVisible(true);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2b8a3e" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={posts}
        renderItem={({ item }) => (
          <JoinCard 
            item={item} 
            showReviewButton={true} // 종료된 조인이므로 항상 리뷰 평가 버튼 노출
            onReviewPress={handleReviewPress}
          />
        )}
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
            <Text style={styles.emptyText}>종료된 스크린 골프 조인이 없습니다.</Text>
            <Text style={styles.emptySubText}>참여한 조인의 일정이 지나 1시간이 경과하면 이곳에서 이력을 확인하고 매너 평가를 진행할 수 있습니다.</Text>
          </View>
        }
      />
      {selectedPostId && (
        <MannerReviewModal
          isVisible={reviewModalVisible}
          onClose={() => {
            setReviewModalVisible(false);
            fetchPosts(); // 평가 상태 갱신 반영
          }}
          joinPostId={selectedPostId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f8f9',
  },
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
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
    lineHeight: 18,
  },
});
