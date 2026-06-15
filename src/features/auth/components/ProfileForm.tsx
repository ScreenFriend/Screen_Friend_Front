import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../contexts/AuthContext';
import { apiService, API_BASE_URL } from '../../../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function ProfileForm() {
  const { user, setUser, logout } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [password, setPassword] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [averageScore, setAverageScore] = useState<number | null>(user?.averageScore ?? null);
  const [bio, setBio] = useState(user?.bio || '');
  
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const getTemperatureColor = (temp: number) => {
    if (temp >= 37.5) return '#2b8a3e';
    if (temp >= 36.5) return '#e8590c';
    return '#1c7ed6';
  };

  if (!user) return null;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 오류', '프로필 사진 설정을 위해 사진첩 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImageUri(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    if (!nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해 주세요.');
      return;
    }

    // 비밀번호 변경 입력 시 보안 조건 체크 (영문, 숫자, 특수문자 포함 8자 이상)
    if (password) {
      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordRegex.test(password)) {
        Alert.alert('보안 경고', '새 비밀번호는 영문, 숫자, 특수문자를 모두 혼합하여 8자 이상으로 설정해야 합니다.');
        return;
      }
    }

    setLoading(true);
    try {
      const updatedUser = await apiService.updateProfile(
        user.id,
        nickname,
        password || undefined,
        profileImageUri || undefined,
        averageScore,
        bio
      );

      setUser(updatedUser);
      setPassword('');
      setProfileImageUri(null);
      Alert.alert('성공', '프로필 정보가 수정되었습니다.');
    } catch (e: any) {
      Alert.alert('수정 실패', e.response?.data?.message || '정보 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = () => {
    Alert.alert(
      '회원 탈퇴',
      '정말로 회원에서 탈퇴하시겠습니까? 관련 데이터가 모두 영구 삭제됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await apiService.withdraw(user.id);
              Alert.alert('탈퇴 성공', '회원 탈퇴 처리가 완료되었습니다.');
              logout();
            } catch (e) {
              Alert.alert('탈퇴 오류', '탈퇴 처리에 실패했습니다.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleContactSupport = () => {
    const email = 'tlfh04@gmail.com';
    const subject = encodeURIComponent('[골프 스크린 조인] 문의 및 건의사항');
    const body = encodeURIComponent(
      '여기에 건의사항이나 문의하실 내용을 작성해 주세요.\n\n' +
      '-------------------\n' +
      `* 사용자 계정: ${user.email}\n` +
      `* 닉네임: ${user.nickname}\n` +
      '-------------------'
    );
    const url = `mailto:${email}?subject=${subject}&body=${body}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('알림', '기기에서 이메일 앱을 열 수 없습니다. tlfh04@gmail.com으로 이메일을 보내주세요.');
    });
  };



  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(100, insets.bottom + 20),
        }
      ]}
    >
      <View style={styles.imageSection}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
          {profileImageUri || user.profileImageUrl ? (
            <Image
              source={
                profileImageUri
                  ? { uri: profileImageUri }
                  : {
                      uri: user.profileImageUrl.startsWith('http')
                        ? user.profileImageUrl
                        : `${API_BASE_URL}${user.profileImageUrl}`
                    }
              }
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Ionicons name="person" size={54} color="#adb5bd" />
            </View>
          )}
          <View style={styles.cameraIconContainer}>
            <Text style={styles.cameraIconText}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.emailText}>{user.email}</Text>
        {user.mannerTemperature !== undefined && user.mannerTemperature !== null && (
          <View style={styles.tempContainer}>
            <Text style={[styles.tempText, { color: getTemperatureColor(user.mannerTemperature) }]}>
              🌡️ 내 매너 온도: {user.mannerTemperature}°C
            </Text>
          </View>
        )}
        <Text style={styles.providerText}>
          가입 경로: {user.provider === 'LOCAL' ? '일반 가입' : user.provider}
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>평균 타수</Text>
        <View style={styles.chipContainer}>
          {[null, 60, 70, 80, 90, 100].map((score) => {
            const isSelected = averageScore === score;
            return (
              <TouchableOpacity
                key={score === null ? 'null' : score}
                style={[styles.chip, isSelected && styles.selectedChip]}
                onPress={() => setAverageScore(score)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                  {score === null ? '미공개' : `${score}타`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>닉네임</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          style={styles.input}
          placeholder="닉네임"
        />

        <Text style={styles.label}>간단 소개</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={styles.input}
          placeholder="나를 소개할 한 줄을 적어보세요 (예: 80타 싱글 목표!)"
          maxLength={100}
        />

        {user.provider === 'LOCAL' && (
          <>
            <Text style={styles.label}>새 비밀번호 (변경 시에만 입력)</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="새 비밀번호 (영문, 숫자, 특수문자 조합 8자 이상)"
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
              <Text style={styles.successMessage}>사용 가능한 비밀번호입니다.</Text>
            )}
          </>
        )}

        <Text style={styles.label}>성별</Text>
        <TextInput
          value={user.gender === 'MALE' ? '남성' : '여성'}
          style={[styles.input, styles.disabledInput]}
          editable={false}
        />

        <Text style={styles.label}>휴대폰 번호</Text>
        <TextInput
          value={user.phoneNumber}
          style={[styles.input, styles.disabledInput]}
          editable={false}
        />
      </View>

      <TouchableOpacity onPress={handleUpdate} style={styles.saveButton} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>정보 수정 완료</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footerButtons}>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleContactSupport} style={styles.supportButton}>
          <Text style={styles.supportButtonText}>문의하기</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleWithdraw} style={styles.withdrawButton}>
          <Text style={styles.withdrawButtonText}>회원 탈퇴</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  imageSection: {
    alignItems: 'center',
    marginVertical: 25,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#f1f3f5',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 5,
    backgroundColor: '#2b8a3e',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIconText: {
    fontSize: 14,
    color: '#fff',
  },
  emailText: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333',
  },
  tempContainer: {
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tempText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  providerText: {
    fontSize: 13,
    color: '#868e96',
    marginTop: 5,
  },
  form: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 16,
    fontSize: 15,
  },
  disabledInput: {
    backgroundColor: '#f1f3f5',
    color: '#868e96',
    borderColor: '#e9ecef',
  },
  saveButton: {
    height: 50,
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 20,
    marginBottom: 30,
  },
  logoutButton: {
    padding: 10,
  },
  logoutButtonText: {
    color: '#495057',
    fontSize: 15,
    fontWeight: 'bold',
  },
  supportButton: {
    padding: 10,
  },
  supportButtonText: {
    color: '#2b8a3e',
    fontSize: 15,
    fontWeight: 'bold',
  },
  withdrawButton: {
    padding: 10,
  },
  withdrawButtonText: {
    color: '#fa5252',
    fontSize: 15,
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedChip: {
    backgroundColor: '#2b8a3e',
    borderColor: '#2b8a3e',
  },
  chipText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#495057',
  },
  selectedChipText: {
    color: '#fff',
  },
  profileImagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center',
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
