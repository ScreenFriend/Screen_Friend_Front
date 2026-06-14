import React from 'react';
import { StyleSheet, Modal, SafeAreaView, TouchableOpacity, Text, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { API_BASE_URL } from '../../../api/client';

interface SocialLoginWebViewProps {
  visible: boolean;
  provider: 'google' | 'kakao';
  onClose: () => void;
  onSuccess: (token: string) => void;
  onFailure: (errorMsg: string) => void;
}

export default function SocialLoginWebView({
  visible,
  provider,
  onClose,
  onSuccess,
  onFailure,
}: SocialLoginWebViewProps) {

  const loginUrl = `${API_BASE_URL}/oauth2/authorization/${provider}`;

  const checkUrlForToken = (url: string): boolean => {
    console.log('[SocialLoginWebView] URL 검사:', url);
    if (url.includes(API_BASE_URL) || url.includes('/?token=')) {
      const match = url.match(/[?&]token=([^&]+)/);
      if (match) {
        const token = match[1];
        console.log('[SocialLoginWebView] URL에서 토큰 검출 성공:', token);
        onSuccess(token);
        return true;
      }
    }
    return false;
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    checkUrlForToken(navState.url);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {provider === 'google' ? '구글' : '카카오'} 로그인
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>취소</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: loginUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={(syntheticEvent) => {
            checkUrlForToken(syntheticEvent.nativeEvent.url);
          }}
          onShouldStartLoadWithRequest={(request) => {
            const hasToken = checkUrlForToken(request.url);
            return !hasToken;
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          style={styles.webview}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            onFailure(nativeEvent.description || '페이지 로딩 실패');
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 14,
    color: '#888',
  },
  webview: {
    flex: 1,
  },
});
