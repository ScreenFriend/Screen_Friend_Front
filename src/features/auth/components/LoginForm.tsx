import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import SocialLoginWebView from './SocialLoginWebView';
import { Ionicons } from '@expo/vector-icons';
import { useEffect as reactUseEffect } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'google' | 'kakao'>('google');
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [findEmail, setFindEmail] = useState('');
  const [findPhone, setFindPhone] = useState('');

  // 아이디 찾기 상태 변수
  const [findIdModalVisible, setFindIdModalVisible] = useState(false);
  const [findIdName, setFindIdName] = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');
  const [foundEmail, setFoundEmail] = useState('');

  // 이메일 저장 상태 변수
  const [rememberEmail, setRememberEmail] = useState(false);

  reactUseEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const saved = await SecureStore.getItemAsync('savedEmail');
        if (saved) {
          setEmail(saved);
          setRememberEmail(true);
        }
      } catch (e) {
        console.log('저장된 이메일 로드 실패:', e);
      }
    };
    loadSavedEmail();
  }, []);

  const { checkLogin } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    console.log('[LoginForm] 로그인 시도 이메일:', email);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      console.log('[LoginForm] /login POST 요청 전송...');
      const response = await apiClient.post('/login', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      // 로컬 저장소에 토큰 기록 (데이터 타입 방어 코드)
      let token = null;
      if (response.data) {
        const parsedData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        token = parsedData.token;
      }

      if (token) {
        console.log('[LoginForm] 실제 세션 토큰 저장 성공:', token);
        await SecureStore.setItemAsync('userToken', token);
      } else {
        console.log('[LoginForm] 실제 세션 토큰이 비어있어 더미 토큰을 저장합니다.');
        await SecureStore.setItemAsync('userToken', 'dummy_session_token');
      }

      console.log('[LoginForm] checkLogin 호출 중...');
      await checkLogin();
      console.log('[LoginForm] checkLogin 완료.');

      // 이메일 저장 여부에 따른 처리
      if (rememberEmail) {
        await SecureStore.setItemAsync('savedEmail', email.trim());
      } else {
        await SecureStore.deleteItemAsync('savedEmail');
      }
    } catch (error: any) {
      console.error('[LoginForm] 로그인 에러:', error);
      let errorMsg = '서버와의 통신이 원활하지 않습니다.';
      if (error.response) {
        if (error.response.status === 401) {
          errorMsg = '이메일 아이디 또는 비밀번호가 일치하지 않습니다.';
        } else {
          errorMsg = error.response.data?.message || JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      Alert.alert('로그인 실패', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const openSocialLogin = (provider: 'google' | 'kakao') => {
    setSocialProvider(provider);
    setSocialModalVisible(true);
  };

  const handleSocialSuccess = async (token: string) => {
    setSocialModalVisible(false);
    setLoading(true);
    try {
      console.log('[LoginForm] 소셜 로그인 성공, 토큰 저장:', token);
      await SecureStore.setItemAsync('userToken', token);
      await checkLogin();
    } catch (e) {
      Alert.alert('로그인 오류', '소셜 계정 정보를 동기화하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleFindPassword = async () => {
    if (!findEmail || !findPhone) {
      Alert.alert('알림', '이메일과 휴대폰 번호를 모두 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/api/users/find-password', {
        email: findEmail.trim(),
        phoneNumber: findPhone.trim(),
      });
      Alert.alert('성공', '등록된 휴대폰 번호로 임시 비밀번호가 발송되었습니다.');
      setForgotPasswordModalVisible(false);
      setFindEmail('');
      setFindPhone('');
    } catch (error: any) {
      console.error('[LoginForm] 비밀번호 찾기 에러:', error);
      const errorMsg = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.';
      Alert.alert('비밀번호 찾기 실패', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFindId = async () => {
    if (!findIdName || !findIdPhone) {
      Alert.alert('알림', '이름과 휴대폰 번호를 모두 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post('/api/users/find-id', {
        name: findIdName.trim(),
        phoneNumber: findIdPhone.trim(),
      });
      if (response.data && response.data.email) {
        setFoundEmail(response.data.email);
      } else {
        Alert.alert('안내', '일치하는 이메일 정보를 찾을 수 없습니다.');
      }
    } catch (error: any) {
      console.error('[LoginForm] 아이디 찾기 에러:', error);
      const errorMsg = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.';
      Alert.alert('아이디 찾기 실패', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const closeFindIdModal = () => {
    setFindIdModalVisible(false);
    setFindIdName('');
    setFindIdPhone('');
    setFoundEmail('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>스크린친구</Text>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="이메일 아이디"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />
        <TouchableOpacity
          style={styles.rememberContainer}
          onPress={() => setRememberEmail(!rememberEmail)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={rememberEmail ? "checkbox" : "square-outline"}
            size={18}
            color={rememberEmail ? "#2b8a3e" : "#adb5bd"}
          />
          <Text style={styles.rememberText}>이메일 저장</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleLogin} style={styles.loginButton} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>로그인</Text>
        )}
      </TouchableOpacity>

      <View style={styles.signupPromptContainer}>
        <Text style={styles.promptText}>아직 회원이 아니신가요? </Text>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.signupLink}>회원가입</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.findLinkContainer}>
        <TouchableOpacity onPress={() => setFindIdModalVisible(true)}>
          <Text style={styles.findLinkText}>아이디 찾기</Text>
        </TouchableOpacity>
        <Text style={styles.linkDivider}>|</Text>
        <TouchableOpacity onPress={() => setForgotPasswordModalVisible(true)}>
          <Text style={styles.findLinkText}>비밀번호 찾기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>간편 로그인</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.socialContainer}>
        <TouchableOpacity
          onPress={() => openSocialLogin('kakao')}
          style={[styles.socialButton, { backgroundColor: '#FEE500' }]}
        >
          <Text style={[styles.socialButtonText, { color: '#000' }]}>카카오 로그인</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => openSocialLogin('google')}
          style={[styles.socialButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }]}
        >
          <Text style={[styles.socialButtonText, { color: '#000' }]}>구글 로그인</Text>
        </TouchableOpacity>
      </View>

      <SocialLoginWebView
        visible={socialModalVisible}
        provider={socialProvider}
        onClose={() => setSocialModalVisible(false)}
        onSuccess={handleSocialSuccess}
        onFailure={(msg) => {
          setSocialModalVisible(false);
          Alert.alert('소셜 로그인 실패', msg);
        }}
      />

      {/* 비밀번호 찾기 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={forgotPasswordModalVisible}
        onRequestClose={() => setForgotPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔑 임시 비밀번호 발급</Text>
            <Text style={styles.modalDescription}>
              가입하신 이메일 아이디와 휴대폰 번호를 입력해 주세요. 일치할 경우 임시 비밀번호를 전송해 드립니다.
            </Text>

            <TextInput
              placeholder="가입 이메일"
              value={findEmail}
              onChangeText={setFindEmail}
              style={styles.modalInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="휴대폰 번호 (하이픈 - 포함 가능)"
              value={findPhone}
              onChangeText={setFindPhone}
              style={styles.modalInput}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                onPress={() => setForgotPasswordModalVisible(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
              >
                <Text style={styles.modalCancelButtonText}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFindPassword}
                style={[styles.modalButton, styles.modalSubmitButton]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>임시 비밀번호 발송</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 아이디 찾기 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={findIdModalVisible}
        onRequestClose={closeFindIdModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔍 아이디(이메일) 찾기</Text>

            {foundEmail ? (
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <Text style={{ fontSize: 14, color: '#495057', marginBottom: 8, textAlign: 'center' }}>가입하신 이메일 아이디는 다음과 같습니다.</Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2b8a3e', marginVertical: 10 }}>{foundEmail}</Text>

                <TouchableOpacity
                  onPress={closeFindIdModal}
                  style={[styles.modalButton, styles.modalSubmitButton, { width: '100%', marginTop: 20 }]}
                >
                  <Text style={styles.modalSubmitButtonText}>로그인하러 가기</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  회원가입 시 등록된 이름과 휴대폰 번호를 입력해 주세요.
                </Text>

                <TextInput
                  placeholder="이름"
                  value={findIdName}
                  onChangeText={setFindIdName}
                  style={styles.modalInput}
                  autoCapitalize="none"
                />
                <TextInput
                  placeholder="휴대폰 번호 (하이픈 - 포함 가능)"
                  value={findIdPhone}
                  onChangeText={setFindIdPhone}
                  style={styles.modalInput}
                  keyboardType="phone-pad"
                />

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    onPress={closeFindIdModal}
                    style={[styles.modalButton, styles.modalCancelButton]}
                  >
                    <Text style={styles.modalCancelButtonText}>취소</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleFindId}
                    style={[styles.modalButton, styles.modalSubmitButton]}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalSubmitButtonText}>아이디 찾기</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#2b8a3e',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 12,
    fontSize: 15,
  },
  loginButton: {
    height: 50,
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupPromptContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 14,
  },
  promptText: {
    color: '#868e96',
    fontSize: 14,
  },
  findLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 35,
  },
  findLinkText: {
    color: '#495057',
    fontWeight: '500',
    fontSize: 14,
  },
  signupLink: {
    color: '#2b8a3e',
    fontWeight: 'bold',
    fontSize: 14,
  },
  linkDivider: {
    color: '#dee2e6',
    marginHorizontal: 10,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#aaa',
    fontSize: 13,
  },
  socialContainer: {
    gap: 12,
  },
  socialButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  linkDivider: {
    color: '#ddd',
    marginHorizontal: 8,
  },
  forgotPasswordLink: {
    color: '#2b8a3e',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#e9ecef',
  },
  modalCancelButtonText: {
    color: '#495057',
    fontWeight: 'bold',
  },
  modalSubmitButton: {
    backgroundColor: '#2b8a3e',
  },
  modalSubmitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingLeft: 2,
  },
  rememberText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
});
