import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { JoinPostResponse } from '../../../api/types';

interface JoinCardProps {
  item: JoinPostResponse;
  onJoinPress?: (id: number) => void;
  showReviewButton?: boolean;
  onReviewPress?: (id: number) => void;
}

export default function JoinCard({ item, onJoinPress, showReviewButton, onReviewPress }: JoinCardProps) {
  const router = useRouter();
  const isCompleted = item.status === 'COMPLETED';
  const isCancelled = item.status === 'CANCELLED';

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const rawHours = d.getHours();
      const ampm = rawHours >= 12 ? '오후' : '오전';
      let hours = rawHours % 12;
      hours = hours ? hours : 12;
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${d.getMonth() + 1}월 ${d.getDate()}일 ${ampm} ${hours}시 ${minutes}분`;
    } catch (e) {
      return dateStr;
    }
  };

  const getPaymentBadgeText = (type?: string) => {
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
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/joins/[id]', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'column', gap: 4 }}>
          <View style={styles.golfCenterContainer}>
            {item.dong ? (
              <Text style={styles.dongBadge}>[{item.dong}]</Text>
            ) : null}
            <Text style={styles.golfCenter}>{item.golfCenterName}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={[
              styles.reservedBadge,
              item.isReserved ? styles.reservedComplete : styles.reservedWait
            ]}>
              <Text style={[
                styles.reservedText,
                item.isReserved ? { color: '#2b8a3e' } : { color: '#868e96' }
              ]}>
                {item.isReserved ? '⛳ 예약 완료' : '⏳ 예약 대기 (조율)'}
              </Text>
            </View>
            <View style={[styles.reservedBadge, styles.paymentBadge]}>
              <Text style={styles.paymentBadgeText}>
                💳 {getPaymentBadgeText(item.paymentType)}
              </Text>
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {item.myApplicationStatus && (
            <View style={[
              styles.appStatusBadge,
              item.myApplicationStatus === 'ACCEPTED' ? styles.appStatusAccepted : styles.appStatusPending
            ]}>
              <Text style={[
                styles.appStatusText,
                item.myApplicationStatus === 'ACCEPTED' ? { color: '#0ca678' } : { color: '#f59f00' }
              ]}>
                {item.myApplicationStatus === 'ACCEPTED' ? '참가 수락' : '대기 중'}
              </Text>
            </View>
          )}
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
              {item.status === 'RECRUITING' ? '모집중' : item.status === 'COMPLETED' ? '완료' : '취소'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.dateTime}>📅 {formatDate(item.playDateTime)}</Text>
      
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.playersCount}>
          인원: <Text style={styles.highlightText}>{item.currentPlayers}</Text> / {item.maxPlayers} 명
        </Text>
        {showReviewButton ? (
          <TouchableOpacity 
            style={styles.reviewBtn} 
            onPress={() => onReviewPress && onReviewPress(item.id)}
          >
            <Text style={styles.reviewBtnText}>⭐ 동반자 평가</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.joinBtn, isCompleted && styles.disabledBtn]} 
            onPress={() => router.push({ pathname: '/joins/[id]', params: { id: item.id } })}
          >
            <Text style={styles.joinBtnText}>{isCompleted ? '모집 종료' : '상세 보기'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f3f5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  golfCenterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dongBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2b8a3e',
  },
  reservedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    fontSize: 10,
    fontWeight: 'bold',
  },
  golfCenter: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#868e96',
  },
  statusBadge: {
    backgroundColor: '#e6fcf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0ca678',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#868e96',
    lineHeight: 20,
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 12,
  },
  playersCount: {
    fontSize: 14,
    color: '#495057',
  },
  highlightText: {
    color: '#2b8a3e',
    fontWeight: 'bold',
  },
  joinBtn: {
    backgroundColor: '#2b8a3e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  disabledBtn: {
    backgroundColor: '#ced4da',
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  reviewBtn: {
    backgroundColor: '#ffd43b',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffd43b',
  },
  reviewBtnText: {
    color: '#212529',
    fontSize: 13,
    fontWeight: 'bold',
  },
  appStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appStatusAccepted: {
    backgroundColor: '#e6fcf5',
  },
  appStatusPending: {
    backgroundColor: '#fff9db',
  },
  appStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  paymentBadge: {
    backgroundColor: '#f1f3f5',
    borderColor: '#dee2e6',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#495057',
  },
});
