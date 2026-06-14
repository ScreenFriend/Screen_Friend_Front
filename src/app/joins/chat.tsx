import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiService, API_BASE_URL } from '../../api/client';
import { ChatMessage } from '../../api/types';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserProfileModal from '../../components/UserProfileModal';

export default function ChatScreen() {
  const { joinPostId, title } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // 프로필 모달 상태
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const flatListRef = useRef<FlatList | null>(null);

  // 1. 이전 메시지 로드 및 웹소켓 연결
  useEffect(() => {
    if (!joinPostId || !user) return;

    const initChat = async () => {
      try {
        const history = await apiService.getChatMessages(Number(joinPostId));
        setMessages(history);
        setLoading(false);
        // 메시지 로딩 후 하단 스크롤
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
      } catch (e) {
        console.log('이전 채팅 조회 실패:', e);
        setLoading(false);
      }
    };

    initChat();

    // 웹소켓 주소 구성 (http:// -> ws://)
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + `/ws/chat/${joinPostId}`;
    console.log('Connecting to WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket 연결 성공');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const incomingMessage: ChatMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, incomingMessage]);
        // 수신 시 부드럽게 스크롤 하단 이동
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (err) {
        console.log('수신 메시지 파싱 에러:', err);
      }
    };

    ws.onerror = (e) => {
      console.log('WebSocket 에러 발생:', e);
    };

    ws.onclose = (e) => {
      console.log('WebSocket 연결 종료:', e.code, e.reason);
      setIsConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [joinPostId, user]);

  // 메시지 발송
  const handleSend = () => {
    if (!inputText.trim() || !wsRef.current || !isConnected || !user) return;

    const messagePayload = {
      senderId: user.id,
      senderNickname: user.nickname,
      content: inputText.trim(),
    };

    try {
      wsRef.current.send(JSON.stringify(messagePayload));
      setInputText('');
    } catch (err) {
      console.log('메시지 전송 실패:', err);
    }
  };

  const handleProfilePress = (userId: number) => {
    setSelectedUserId(userId);
    setProfileModalVisible(true);
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    // 시스템 알림 메시지 분기
    if (item.senderId === 0) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    const isMe = item.senderId === user?.id;

    if (isMe) {
      return (
        <View style={[styles.messageRow, styles.myMessageRow]}>
          <View style={styles.myBubble}>
            <Text style={styles.myMessageText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageRow}>
        <TouchableOpacity 
          onPress={() => handleProfilePress(item.senderId)}
          activeOpacity={0.7}
        >
          {item.senderProfileImageUrl ? (
            <Image 
              source={{ uri: item.senderProfileImageUrl.startsWith('http') ? item.senderProfileImageUrl : `${API_BASE_URL}${item.senderProfileImageUrl}` }}
              style={styles.opponentAvatar} 
            />
          ) : (
            <View style={styles.opponentAvatarPlaceholder}>
              <Ionicons name="person" size={16} color="#adb5bd" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.opponentContent}>
          <TouchableOpacity onPress={() => handleProfilePress(item.senderId)} activeOpacity={0.7}>
            <Text style={styles.opponentName}>{item.senderNickname}</Text>
          </TouchableOpacity>
          <View style={styles.opponentBubble}>
            <Text style={styles.opponentMessageText}>{item.content}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#343a40" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          💬 {title || '참여자 채팅방'}
        </Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, isConnected ? styles.connectedDot : styles.disconnectedDot]} />
          <Text style={styles.statusText}>{isConnected ? '연결됨' : '연결 해제'}</Text>
        </View>
      </View>

      {/* 대화 바디 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b8a3e" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          contentContainerStyle={styles.chatListContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* 하단 입력 폼 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={isConnected ? "메시지를 입력해 주세요..." : "연결 대기 중..."}
          placeholderTextColor="#adb5bd"
          editable={isConnected}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendBtn, !inputText.trim() && styles.disabledSendBtn]} 
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      {!isKeyboardVisible && insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
      )}

      {/* 공통 프로필 카드 모달 */}
      <UserProfileModal
        userId={selectedUserId}
        isVisible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f9',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343a40',
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectedDot: {
    backgroundColor: '#2b8a3e',
  },
  disconnectedDot: {
    backgroundColor: '#fa5252',
  },
  statusText: {
    fontSize: 11,
    color: '#868e96',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatListContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
    width: '80%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  opponentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dee2e6',
    marginRight: 10,
  },
  opponentContent: {
    flex: 1,
  },
  opponentName: {
    fontSize: 12,
    color: '#495057',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  opponentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 14,
    borderTopLeftRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  opponentMessageText: {
    fontSize: 14,
    color: '#343a40',
    lineHeight: 18,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2b8a3e',
    borderRadius: 14,
    borderTopRightRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 1.5,
    shadowColor: '#2b8a3e',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  myMessageText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f1f3f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#343a40',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2b8a3e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  disabledSendBtn: {
    backgroundColor: '#adb5bd',
  },
  opponentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dee2e6',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  systemMessageContainer: {
    alignSelf: 'center',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    marginVertical: 10,
    maxWidth: '85%',
  },
  systemMessageText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
    textAlign: 'center',
  },
});
