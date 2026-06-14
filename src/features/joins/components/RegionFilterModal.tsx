import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RegionFilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectDong: (dong: string) => void;
}

const REGION_DATA: { [siDo: string]: { [siGunGu: string]: string[] } } = {
  '서울특별시': {
    '강남구': ['역삼동', '삼성동', '청담동', '논현동', '대치동', '신사동', '압구정동', '개포동', '도곡동', '일원동', '수서동'],
    '강동구': ['천호동', '길동', '암사동', '성내동', '둔촌동', '명일동', '고덕동', '상일동', '강일동'],
    '강북구': ['미아동', '번동', '수유동', '우이동'],
    '강서구': ['화곡동', '가양동', '등촌동', '방화동', '공항동', '발산동', '염창동'],
    '관악구': ['신림동', '봉천동', '남현동'],
    '광진구': ['구의동', '화양동', '자양동', '군자동', '중곡동', '능동', '광장동'],
    '구로구': ['구로동', '신도림동', '개봉동', '고척동', '오류동', '수궁동', '가리봉동'],
    '금천구': ['가산동', '독산동', '시흥동'],
    '노원구': ['상계동', '중계동', '하계동', '월계동', '공릉동'],
    '도봉구': ['쌍문동', '방학동', '창동', '도봉동'],
    '동대문구': ['장안동', '답십리동', '전농동', '제기동', '청량리동', '회기동', '이문동', '휘경동', '용두동'],
    '동작구': ['노량진동', '상도동', '흑석동', '사당동', '대방동', '신대방동'],
    '마포구': ['공덕동', '아현동', '망원동', '연남동', '서교동', '합정동', '상암동', '성산동', '도화동'],
    '서대문구': ['신촌동', '창천동', '홍제동', '남가좌동', '북가좌동', '연희동'],
    '서초구': ['서초동', '반포동', '방배동', '양재동', '잠원동', '내곡동'],
    '성동구': ['성수동', '왕십리동', '행당동', '금호동', '옥수동', '마장동', '송정동', '용답동'],
    '성북구': ['안암동', '돈암동', '길음동', '종암동', '석관동', '정릉동', '삼선동'],
    '송파구': ['잠실동', '방이동', '오금동', '가락동', '문정동', '장지동', '신천동', '풍납동', '삼전동', '석촌동'],
    '양천구': ['목동', '신월동', '신정동'],
    '영등포구': ['여의도동', '당산동', '문래동', '양평동', '신길동', '대림동', '영등포동'],
    '용산구': ['이태원동', '한남동', '서빙고동', '이촌동', '원효로', '갈월동', '효창동'],
    '은평구': ['불광동', '갈현동', '수색동', '녹번동', '대조동', '역촌동', '신사동', '증산동'],
    '종로구': ['혜화동', '삼청동', '평창동', '무악동', '사직동', '가회동'],
    '중구': ['명동', '을지로동', '신당동', '다산동', '약수동', '회현동', '필동', '장충동'],
    '중랑구': ['면목동', '상봉동', '중화동', '묵동', '망우동', '신내동']
  },
  '경기도': {
    '수원시': ['인계동', '매탄동', '영통동', '망포동', '우만동', '조원동', '율전동', '송죽동', '권선동', '세류동'],
    '성남시': ['분당동', '서현동', '수내동', '정자동', '야탑동', '판교동', '삼평동', '금광동', '상대원동', '은행동'],
    '고양시': ['장항동', '마두동', '백석동', '주엽동', '탄현동', '대화동', '식사동', '화정동', '행신동'],
    '용인시': ['죽전동', '풍덕천동', '신갈동', '구갈동', '동백동', '역북동', '보정동', '상현동', '마북동'],
    '부천시': ['중동', '상동', '심곡동', '역곡동', '송내동', '소사본동', '원종동', '고강동'],
    '안산시': ['고잔동', '중앙동', '초지동', '선부동', '본오동', '사동', '와동'],
    '안양시': ['안양동', '석수동', '박달동', '관양동', '평촌동', '범계동', '호계동', '비산동'],
    '남양주시': ['와부읍', '화도읍', '진접읍', '오남읍', '퇴계원읍', '다산동', '별내동', '평내동', '호평동'],
    '화성시': ['동탄동', '향남읍', '봉담읍', '우정읍', '남양읍', '병점동', '새솔동']
  },
  '인천광역시': {
    '부평구': ['부평동', '산곡동', '청천동', '갈산동', '삼산동', '부개동', '일신동', '십정동'],
    '연수구': ['송도동', '연수동', '동춘동', '옥련동', '청학동', '선학동'],
    '남동구': ['구월동', '간석동', '만수동', '서창동', '논현동', '도림동', '남촌동'],
    '서구': ['검암동', '연희동', '청라동', '가정동', '신현동', '석남동', '가좌동', '검단동']
  },
  '부산광역시': {
    '해운대구': ['우동', '좌동', '중동', '재송동', '반여동', '반송동', '송정동'],
    '부산진구': ['부전동', '전포동', '양정동', '개금동', '가야동', '당감동', '범천동'],
    '수영구': ['남천동', '광안동', '민락동', '망미동', '수영동'],
    '동래구': ['온천동', '사직동', '명륜동', '안락동', '수안동', '복천동'],
    '사하구': ['하단동', '다대동', '괴정동', '당리동', '신평동', '장림동'],
    '금정구': ['장전동', '구서동', '부곡동', '남산동', '서동', '청룡동']
  },
  '대전광역시': {
    '서구': ['둔산동', '탄방동', '괴정동', '갈마동', '도안동', '관저동', '가장동', '변동'],
    '유성구': ['봉명동', '궁동', '상대동', '지족동', '노은동', '덕명동', '신성동', '전민동'],
    '중구': ['은행동', '대흥동', '오류동', '태평동', '문화동', '유천동', '산성동'],
    '동구': ['용전동', '자양동', '가양동', '판암동', '신흥동', '대동', '삼성동'],
    '대덕구': ['오정동', '송촌동', '신탄진동', '법동', '비래동', '중리동']
  },
  '대구광역시': {
    '수성구': ['범어동', '만촌동', '황금동', '두산동', '지산동', '범물동', '상동', '파동'],
    '달서구': ['신당동', '이곡동', '상인동', '월성동', '죽전동', '송현동', '본리동', '진천동'],
    '중구': ['삼덕동', '동성로', '대봉동', '남산동', '대신동', '동인동'],
    '북구': ['침산동', '칠성동', '복현동', '태전동', '산격동', '동천동', '국우동'],
    '동구': ['신천동', '효목동', '방촌동', '율하동', '지저동', '동호동', '불로동']
  },
  '광주광역시': {
    '서구': ['치평동', '쌍촌동', '화정동', '풍암동', '금호동', '농성동', '광천동'],
    '북구': ['용봉동', '오치동', '신용동', '운암동', '두암동', '삼각동', '매곡동'],
    '광산구': ['수완동', '쌍암동', '신가동', '우산동', '월계동', '첨단동', '운남동'],
    '남구': ['봉선동', '주월동', '진월동', '노대동', '방림동'],
    '동구': ['충장동', '학동', '소태동', '산수동', '지산동', '계림동']
  },
  '울산광역시': {
    '남구': ['삼산동', '달동', '신정동', '무거동', '야음동', '옥동', '선암동'],
    '중구': ['우정동', '성남동', '반구동', '태화동', '다운동', '약사동', '남외동'],
    '북구': ['화봉동', '송정동', '매곡동', '농소동', '염포동', '양정동'],
    '동구': ['방어동', '일산동', '전하동', '화정동', '서부동'],
    '울주군': ['범서읍', '온양읍', '언양읍', '온산읍', '청량읍']
  },
  '세종특별자치시': {
    '세종시': ['도담동', '아름동', '종촌동', '고운동', '다정동', '새롬동', '한솔동', '보람동', '소담동', '조치원읍', '어진동', '나성동']
  },
  '강원특별자치도': {
    '춘천시': ['석사동', '퇴계동', '온의동', '후평동', '효자동', '삼천동', '근화동'],
    '원주시': ['단계동', '무실동', '단구동', '반곡동', '일산동', '태장동', '개운동'],
    '강릉시': ['교동', '송정동', '입암동', '홍제동', '포남동', '초당동', '주문진읍']
  },
  '충청북도': {
    '청주시': ['가경동', '복대동', '율량동', '용암동', '산남동', '오창읍', '금천동', '분평동'],
    '충주시': ['연수동', '호암동', '칠금동', '교현동', '문화동', '안림동'],
    '제천시': ['신백동', '청전동', '화산동', '중앙동', '교동']
  },
  '충청남도': {
    '천안시': ['신부동', '쌍용동', '불당동', '백석동', '성정동', '두정동', '청수동', '신방동'],
    '아산시': ['배방읍', '탕정면', '온천동', '실옥동', '풍기동', '용화동'],
    '서산시': ['동문동', '석남동', '예천동', '읍내동', '갈산동']
  },
  '전북특별자치도': {
    '전주시': ['효자동', '송천동', '우아동', '서신동', '중화산동', '혁신동', '평화동', '인후동'],
    '군산시': ['수송동', '조촌동', '나운동', '소룡동', '문화동', '미룡동'],
    '익산시': ['영등동', '모현동', '어양동', '신동', '부송동', '동산동']
  },
  '전라남도': {
    '여수시': ['학동', '여서동', '웅천동', '국동', '시전동', '신기동', '문수동'],
    '순천시': ['조례동', '연향동', '오천동', '왕지동', '해룡면', '덕월동', '중앙동'],
    '목포시': ['상동', '옥암동', '용당동', '하당동', '석현동', '산정동']
  },
  '경상북도': {
    '포항시': ['효자동', '대이동', '장성동', '두호동', '해도동', '오천읍', '연일읍', '흥해읍'],
    '구미시': ['송정동', '원평동', '인동', '옥계동', '진평동', '형곡동', '사곡동'],
    '경산시': ['대동', '사동', '삼북동', '하양읍', '옥산동', '계양동', '진량읍']
  },
  '경상남도': {
    '창원시': ['상남동', '중앙동', '용호동', '봉곡동', '합성동', '양덕동', '내동', '장천동', '팔용동', '석동'],
    '김해시': ['내동', '삼계동', '부원동', '장유동', '진영읍', '구산동', '어방동'],
    '진주시': ['가좌동', '주약동', '충무공동', '평거동', '초전동', '칠암동', '하대동']
  },
  '제주특별자치도': {
    '제주시': ['노형동', '연동', '아라동', '이도동', '일도동', '삼도동', '외도동', '한림읍', '화북동', '봉개동'],
    '서귀포시': ['동홍동', '서홍동', '강정동', '대정읍', '성산읍', '법환동', '토평동']
  }
};

export default function RegionFilterModal({ isVisible, onClose, onSelectDong }: RegionFilterModalProps) {
  // 선택 단계 (0: 시/도, 1: 구/시, 2: 동)
  const [step, setStep] = useState<number>(0);

  const [selectedSiDo, setSelectedSiDo] = useState<string>('');
  const [selectedSiGunGu, setSelectedSiGunGu] = useState<string>('');

  const siDos = Object.keys(REGION_DATA);
  const siGunGus = selectedSiDo ? Object.keys(REGION_DATA[selectedSiDo]) : [];
  const dongs = (selectedSiDo && selectedSiGunGu) ? REGION_DATA[selectedSiDo][selectedSiGunGu] : [];

  useEffect(() => {
    if (isVisible) {
      setStep(0);
      setSelectedSiDo('');
      setSelectedSiGunGu('');
    }
  }, [isVisible]);

  const handleSiDoSelect = (siDo: string) => {
    setSelectedSiDo(siDo);
    setStep(1);
  };

  const handleSiGunGuSelect = (siGunGu: string) => {
    setSelectedSiGunGu(siGunGu);
    setStep(2);
  };

  const handleDongSelect = (dong: string) => {
    onSelectDong(dong);
    onClose();
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* 헤더 */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              {step > 0 && (
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={24} color="#495057" />
                </TouchableOpacity>
              )}
              <Text style={styles.modalTitle}>
                {step === 0 && '🌐 지역 선택 (시/도)'}
                {step === 1 && `📍 ${selectedSiDo} (구/시)`}
                {step === 2 && `⛳ ${selectedSiGunGu} (동/읍/면)`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#495057" />
            </TouchableOpacity>
          </View>

          {/* 브레드크럼 (현재 경로 인디케이터) */}
          <View style={styles.breadcrumbContainer}>
            <Text style={[styles.breadcrumbText, step >= 0 && styles.activeBreadcrumb]}>
              시/도
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#adb5bd" />
            <Text style={[styles.breadcrumbText, step >= 1 && styles.activeBreadcrumb]}>
              {selectedSiDo ? selectedSiDo : '구/시'}
            </Text>
            <Ionicons name="chevron-forward" size={12} color="#adb5bd" />
            <Text style={[styles.breadcrumbText, step >= 2 && styles.activeBreadcrumb]}>
              {selectedSiGunGu ? selectedSiGunGu : '동/읍/면'}
            </Text>
          </View>

          {/* 목록 선택 영역 */}
          <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={true}>
            {step === 0 && (
              <View style={styles.gridContainer}>
                {siDos.map((sido) => (
                  <TouchableOpacity
                    key={sido}
                    style={styles.gridItem}
                    onPress={() => handleSiDoSelect(sido)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.gridItemText}>{sido}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 1 && (
              <View style={styles.gridContainer}>
                {siGunGus.map((sigungu) => (
                  <TouchableOpacity
                    key={sigungu}
                    style={styles.gridItem}
                    onPress={() => handleSiGunGuSelect(sigungu)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.gridItemText}>{sigungu}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 2 && (
              <View style={styles.gridContainer}>
                {dongs.map((dong) => (
                  <TouchableOpacity
                    key={dong}
                    style={[styles.gridItem, styles.dongItem]}
                    onPress={() => handleDongSelect(dong)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.gridItemText}>{dong}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '60%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212529',
  },
  closeBtn: {
    padding: 4,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#adb5bd',
    fontWeight: '600',
  },
  activeBreadcrumb: {
    color: '#2b8a3e',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: (Dimensions.get('window').width - 60) / 3, // 3열 배치
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dongItem: {
    borderColor: '#2b8a3e',
    backgroundColor: '#e6fcf5',
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#495057',
    textAlign: 'center',
  },
});
