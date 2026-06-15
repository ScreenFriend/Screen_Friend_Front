import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { apiService } from '../../../api/client';
import PortOneAuthWebView from './PortOneAuthWebView';
import { Ionicons } from '@expo/vector-icons';


const getPasswordStrength = (pwd: string) => {
  if (pwd.length === 0) return { score: 0, label: '', color: '#adb5bd' };
  
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[a-zA-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 1;

  // 연속성/반복성 감점 요인 체크 (3자 이상 연속/반복 시 페널티 적용)
  let hasSequence = false;
  const keyboardPatterns = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
  const lowerPwd = pwd.toLowerCase();
  
  for (let i = 0; i < lowerPwd.length - 2; i++) {
    const char1 = lowerPwd.charCodeAt(i);
    const char2 = lowerPwd.charCodeAt(i + 1);
    const char3 = lowerPwd.charCodeAt(i + 2);
    
    // 1) 알파벳/숫자 순차 증가 (abc, 123) 또는 감소 (cba, 321)
    if ((char2 === char1 + 1 && char3 === char2 + 1) || (char2 === char1 - 1 && char3 === char2 - 1)) {
      hasSequence = true;
      break;
    }
    
    // 2) 동일 문자 3회 연속 반복 (aaa, 111)
    if (char1 === char2 && char2 === char3) {
      hasSequence = true;
      break;
    }
    
    // 3) 키보드 QWERTY 배열 3자 연속 체크 (qwe, asd, zxc 등)
    const chunk = lowerPwd.substring(i, i + 3);
    for (const pattern of keyboardPatterns) {
      if (pattern.includes(chunk) || pattern.split('').reverse().join('').includes(chunk)) {
        hasSequence = true;
        break;
      }
    }
    if (hasSequence) break;
  }

  if (pwd.length < 8) {
    return { score: 1, label: '위험 (8자 미만)', color: '#fa5252' };
  }
  
  if (hasSequence) {
    return { score: 1, label: '위험 (연속/반복 패턴 포함)', color: '#fa5252' };
  }
  
  if (score === 4) {
    return { score: 3, label: '안전 (보안성 높음)', color: '#2b8a3e' };
  } else if (score === 3) {
    return { score: 2, label: '보통 (특수문자 추가 권장)', color: '#f59f00' };
  } else {
    return { score: 1, label: '위험 (조합 부족)', color: '#fa5252' };
  }
};

export default function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [phoneNumber, setPhoneNumber] = useState('');

  // 포트원 본인인증 관련 상태
  const [portOneModalVisible, setPortOneModalVisible] = useState(false);
  const [identityVerificationId, setIdentityVerificationId] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');

  // 필수 약관 동의 상태
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeLocation, setAgreeLocation] = useState(false);
  const [agreeAll, setAgreeAll] = useState(false);

  const handleAgreeAll = (value: boolean) => {
    setAgreeAll(value);
    setAgreeTerms(value);
    setAgreePrivacy(value);
    setAgreeLocation(value);
  };

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 포트원 인증 완료 성공 핸들러
  const handlePortOneSuccess = async (idVerificationId: string) => {
    setPortOneModalVisible(false);
    setLoading(true);
    try {
      const certInfo = await apiService.verifyPortOne(idVerificationId);

      setIdentityVerificationId(idVerificationId);
      setPhoneNumber(certInfo.phone);
      setGender(certInfo.gender as any);
      setVerifiedName(certInfo.name);
      setIsVerified(true);

      Alert.alert('인증 성공', `[${certInfo.name}]님의 본인인증이 완료되었습니다.`);
    } catch (e) {
      Alert.alert('인증 검증 실패', '본인인증 검증에 실패했습니다. 다시 시도해 주세요.');
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !passwordConfirm || !nickname) {
      Alert.alert('알림', '모든 입력 항목을 채워주세요.');
      return;
    }

    // 비밀번호 보안 조건 체크 (영문, 숫자, 특수문자 포함 8자 이상)
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert('보안 경고', '비밀번호 조건을 충족하지 않습니다. 영문, 숫자, 특수문자 조합 8자 이상으로 설정해 주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('오류', '비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    if (!isVerified) {
      Alert.alert('인증 필요', '휴대폰 본인인증을 먼저 진행해 주세요.');
      return;
    }

    if (!agreeTerms || !agreePrivacy || !agreeLocation) {
      Alert.alert('동의 필요', '필수 약관 및 개인정보, 위치정보 서비스 이용에 모두 동의해 주세요.');
      return;
    }

    setLoading(true);
    try {
      await apiService.signUp({
        email,
        password,
        passwordConfirm,
        nickname,
        gender,
        phoneNumber,
        identityVerificationId,
      });

      Alert.alert('가입 완료', '회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.', [
        {
          text: '확인',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '회원가입 중 오류가 발생했습니다.';
      Alert.alert('가입 실패', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>회원가입</Text>

      <View style={styles.form}>
        <Text style={styles.label}>이메일 아이디</Text>
        <TextInput
          placeholder="이메일을 입력하세요"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          placeholder="비밀번호 (영문, 숫자, 특수문자 조합 8자 이상)"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />
        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBarRow}>
              <View style={[styles.strengthBar, { backgroundColor: getPasswordStrength(password).score >= 1 ? getPasswordStrength(password).color : '#e9ecef' }]} />
              <View style={[styles.strengthBar, { backgroundColor: getPasswordStrength(password).score >= 2 ? getPasswordStrength(password).color : '#e9ecef' }]} />
              <View style={[styles.strengthBar, { backgroundColor: getPasswordStrength(password).score >= 3 ? getPasswordStrength(password).color : '#e9ecef' }]} />
            </View>
            <Text style={[styles.strengthLabel, { color: getPasswordStrength(password).color }]}>
              보안 등급: {getPasswordStrength(password).label}
            </Text>
          </View>
        )}
        {password.length > 0 && !/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password) && (
          <Text style={styles.errorMessage}>영문, 숫자, 특수문자를 혼합하여 8자 이상이어야 합니다.</Text>
        )}
        {password.length > 0 && /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/.test(password) && (
          <Text style={styles.successMessage}>안전한 비밀번호입니다.</Text>
        )}

        <Text style={styles.label}>비밀번호 확인</Text>
        <TextInput
          placeholder="비밀번호 확인"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          style={styles.input}
          secureTextEntry
        />
        {passwordConfirm.length > 0 && password !== passwordConfirm && (
          <Text style={styles.errorMessage}>비밀번호가 일치하지 않습니다.</Text>
        )}
        {passwordConfirm.length > 0 && password === passwordConfirm && (
          <Text style={styles.successMessage}>비밀번호가 일치합니다.</Text>
        )}

        <Text style={styles.label}>닉네임</Text>
        <TextInput
          placeholder="사용할 닉네임을 입력하세요"
          value={nickname}
          onChangeText={setNickname}
          style={styles.input}
        />

        {/* 본인인증 영역 */}
        <Text style={styles.label}>휴대폰 본인인증</Text>
        <View style={styles.verificationRow}>
          <TextInput
            placeholder="본인인증을 완료해 주세요"
            value={isVerified ? `${verifiedName} (${phoneNumber})` : ''}
            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: isVerified ? '#f1f3f5' : '#fff' }]}
            editable={false}
          />
          <TouchableOpacity
            onPress={() => setPortOneModalVisible(true)}
            style={[styles.verifyButton, isVerified && { backgroundColor: '#868e96' }]}
            disabled={isVerified}
          >
            <Text style={styles.verifyButtonText}>{isVerified ? '인증완료' : '인증하기'}</Text>
          </TouchableOpacity>
        </View>



        {isVerified && (
          <View style={styles.genderRow}>
            <Text style={[styles.label, { marginBottom: 0 }]}>성별</Text>
            <Text style={styles.genderText}>{gender === 'MALE' ? '남성' : '여성'}</Text>
          </View>
        )}
        {/* 약관 동의 영역 */}
        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={styles.termAllRow}
            onPress={() => handleAgreeAll(!agreeAll)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={agreeAll ? "checkbox" : "square-outline"}
              size={22}
              color={agreeAll ? "#2b8a3e" : "#adb5bd"}
            />
            <Text style={styles.termAllText}>약관 전체 동의하기</Text>
          </TouchableOpacity>

          <View style={styles.termSeparator} />

          <View style={styles.termItem}>
            <TouchableOpacity
              style={styles.termRow}
              onPress={() => {
                const newVal = !agreeTerms;
                setAgreeTerms(newVal);
                if (!newVal) setAgreeAll(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={agreeTerms ? "checkbox" : "square-outline"}
                size={18}
                color={agreeTerms ? "#2b8a3e" : "#adb5bd"}
              />
              <Text style={styles.termText}>[필수] 서비스 이용약관 동의</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termItem}>
            <TouchableOpacity
              style={styles.termRow}
              onPress={() => {
                const newVal = !agreePrivacy;
                setAgreePrivacy(newVal);
                if (!newVal) setAgreeAll(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={agreePrivacy ? "checkbox" : "square-outline"}
                size={18}
                color={agreePrivacy ? "#2b8a3e" : "#adb5bd"}
              />
              <Text style={styles.termText}>[필수] 개인정보 수집 및 이용 동의</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.termItem}>
            <TouchableOpacity
              style={styles.termRow}
              onPress={() => {
                const newVal = !agreeLocation;
                setAgreeLocation(newVal);
                if (!newVal) setAgreeAll(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={agreeLocation ? "checkbox" : "square-outline"}
                size={18}
                color={agreeLocation ? "#2b8a3e" : "#adb5bd"}
              />
              <Text style={styles.termText}>[필수] 위치정보 서비스 이용 동의</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>

      <TouchableOpacity onPress={handleSignUp} style={styles.submitButton} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>가입 완료</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>로그인 화면으로 돌아가기</Text>
      </TouchableOpacity>

      <PortOneAuthWebView
        visible={portOneModalVisible}
        onClose={() => setPortOneModalVisible(false)}
        onSuccess={handlePortOneSuccess}
        onFailure={(msg) => {
          setPortOneModalVisible(false);
          Alert.alert('본인인증 실패', msg);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 60, // 하단 시스템/네비게이션 영역 겹침 방지
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  errorMessage: {
    color: '#fa5252',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
    fontWeight: '600',
  },
  successMessage: {
    color: '#2b8a3e',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2b8a3e',
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    marginBottom: 30,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 16,
    fontSize: 15,
    color: '#000',
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  verifyButton: {
    height: 50,
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  genderText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2b8a3e',
  },
  submitButton: {
    height: 52,
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    textAlign: 'center',
    color: '#868e96',
    fontSize: 14,
  },
  termsContainer: {
    marginTop: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  termAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  termAllText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212529',
  },
  termSeparator: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginVertical: 12,
  },
  termItem: {
    marginBottom: 10,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  termText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  strengthContainer: {
    marginTop: -8,
    marginBottom: 16,
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
    marginBottom: 6,
  },
  strengthBar: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
