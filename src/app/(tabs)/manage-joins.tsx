import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MyAppliedList from '../../features/joins/components/MyAppliedList';
import MyCreatedList from '../../features/joins/components/MyCreatedList';
import MyCompletedList from '../../features/joins/components/MyCompletedList';

export default function ManageJoinsScreen() {
  const [activeTab, setActiveTab] = useState<'applied' | 'created' | 'completed'>('applied');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>📅 조인 관리</Text>
      </View>

      {/* 세그먼트 탭 버튼 */}
      <View style={styles.tabContainer}>
        <View style={styles.tabWrapper}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'applied' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('applied')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'applied' && styles.activeTabText
              ]}
            >
              신청한 조인
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'created' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('created')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'created' && styles.activeTabText
              ]}
            >
              개설한 조인
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'completed' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'completed' && styles.activeTabText
              ]}
            >
              종료된 조인
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 조인 목록 영역 */}
      <View style={styles.contentContainer}>
        {activeTab === 'applied' ? (
          <MyAppliedList />
        ) : activeTab === 'created' ? (
          <MyCreatedList />
        ) : (
          <MyCompletedList />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f9',
  },
  header: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  tabContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  tabText: {
    fontSize: 14,
    color: '#868e96',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#2b8a3e',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
});
