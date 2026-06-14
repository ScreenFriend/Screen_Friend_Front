import React from 'react';
import { StyleSheet, Modal, SafeAreaView, TouchableOpacity, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { API_BASE_URL } from '../../../api/client';

interface PortOneAuthWebViewProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (identityVerificationId: string) => void;
  onFailure: (errorMsg: string) => void;
}

const PORTONE_STORE_ID = process.env.EXPO_PUBLIC_PORTONE_STORE_ID || '';
const PORTONE_CHANNEL_KEY = process.env.EXPO_PUBLIC_PORTONE_CHANNEL_KEY || '';

export default function PortOneAuthWebView({
  visible,
  onClose,
  onSuccess,
  onFailure,
}: PortOneAuthWebViewProps) {

  // 중복 콜백 방지용 락 레퍼런스
  const hasFinished = React.useRef(false);

  React.useEffect(() => {
    if (visible) {
      hasFinished.current = false;
      console.log('[PortOne] Configured Store ID:', PORTONE_STORE_ID);
      console.log('[PortOne] Configured Channel Key:', PORTONE_CHANNEL_KEY);
      console.log('[PortOne] Env EXPO_PUBLIC_PORTONE_STORE_ID:', process.env.EXPO_PUBLIC_PORTONE_STORE_ID);
    }
  }, [visible]);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>포트원 본인인증</title>
      <script src="https://cdn.portone.io/v2/browser-sdk.js"></script>
      <style>
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          font-family: -apple-system, sans-serif;
          background-color: #f7f9fa;
        }
        .loading {
          font-size: 16px;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="loading" id="loading-text">본인인증 창을 불러오는 중입니다...</div>
      <script>
        // 전역 자바스크립트 에러 감지 및 앱 전달
        window.onerror = function(message, source, lineno, colno, error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            status: "fail",
            message: "자바스크립트 오류: " + message + " (라인: " + lineno + ")"
          }));
          return true;
        };

        function startVerification() {
          try {
            const verificationId = "verif-" + Math.random().toString(36).substr(2, 9) + "-" + new Date().getTime();

            if (typeof PortOne === "undefined") {
              throw new Error("PortOne SDK 스크립트 로드에 실패했습니다. 네트워크 연결을 확인하거나 잠시 후 다시 시도해 주세요.");
            }

            document.getElementById("loading-text").innerText = "본인인증 창으로 연결 중...";

            PortOne.requestIdentityVerification({
              storeId: "${PORTONE_STORE_ID}",
              channelKey: "${PORTONE_CHANNEL_KEY}",
              identityVerificationId: verificationId,
              redirectUrl: "https://localhost/portone-callback",
            }).then(function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: "success",
                identityVerificationId: response.identityVerificationId
              }));
            }).catch(function(error) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: "fail",
                message: error.message || "본인인증에 실패했거나 취소되었습니다."
              }));
            });
          } catch (e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              status: "fail",
              message: e.message || "인증 초기화 중 에러가 발생했습니다."
            }));
          }
        }

        // DOMContentLoaded 이벤트가 이미 지났거나 유실될 수 있으므로, document 로드 상태를 확인하여 초기화
        if (document.readyState === "complete" || document.readyState === "interactive") {
          // 스크립트 리소스 로드를 위해 약간의 딜레이 후 실행
          setTimeout(startVerification, 300);
        } else {
          window.onload = startVerification;
        }
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'success') {
        if (!hasFinished.current) {
          hasFinished.current = true;
          onSuccess(data.identityVerificationId);
        }
      } else {
        if (!hasFinished.current) {
          hasFinished.current = true;
          onFailure(data.message);
        }
      }
    } catch (e) {
      if (!hasFinished.current) {
        hasFinished.current = true;
        onFailure('인증 결과 데이터 파싱 오류');
      }
    }
  };

  // 모바일 리다이렉트 완료 감지 및 성공 처리
  const handleNavigationStateChange = (navState: any) => {
    const callbackUrl = 'https://localhost/portone-callback';
    console.log('[PortOneWebView] Navigating to URL:', navState.url);

    if (navState.url.startsWith(callbackUrl)) {
      const url = navState.url;
      const getParam = (name: string) => {
        const match = RegExp('[?&]' + name + '=([^&]*)').exec(url);
        return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
      };

      const identityVerificationId = getParam('identityVerificationId');
      const errorCode = getParam('code');
      const errorMessage = getParam('message');

      if (identityVerificationId && !errorCode) {
        if (!hasFinished.current) {
          hasFinished.current = true;
          console.log('[PortOneWebView] Redirect Auth Success. ID:', identityVerificationId);
          onSuccess(identityVerificationId);
        }
      } else {
        if (!hasFinished.current) {
          hasFinished.current = true;
          console.log('[PortOneWebView] Redirect Auth Failure:', errorMessage);
          onFailure(errorMessage || '본인인증 실패 또는 취소');
        }
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>본인인증</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>닫기</Text>
          </TouchableOpacity>
        </View>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          javaScriptCanOpenWindowsAutomatically={true}
          style={styles.webview}
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
    color: '#ff5b5b',
  },
  webview: {
    flex: 1,
  },
});
