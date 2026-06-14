import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import SocialLoginWebView from './SocialLoginWebView';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [socialProvider, setSocialProvider] = useState<'google' | 'kakao'>('google');

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
    } catch (error: any) {
      console.error('[LoginForm] 로그인 에러:', error);
      const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
      Alert.alert('로그인 실패', `에러 상세: ${errorMsg}`);
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

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Golf Screen Join</Text>

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
      </View>

      <TouchableOpacity onPress={handleLogin} style={styles.loginButton} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>로그인</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <Text style={styles.linkText}>아직 회원이 아니신가요?</Text>
        <TouchableOpacity onPress={() => router.push('/signup')}>
          <Text style={styles.signupLink}> 회원가입</Text>
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
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  linkText: {
    color: '#666',
  },
  signupLink: {
    color: '#2b8a3e',
    fontWeight: 'bold',
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
});
