# ⛳ 스크린친구 (Screen Friend) - Frontend

**"언제 어디서나 간편하게 찾는 내 주변 스크린 골프 파트너"**

**스크린친구**는 골퍼들이 신뢰할 수 있는 동반자를 찾고 실시간으로 조인 일정을 관리할 수 있도록 지원하는 **크로스 플랫폼(iOS/Android) 모바일 앱**입니다. React Native와 Expo 프레임워크를 기반으로 하며, 지도 연동, 포트원 본인인증 WebView, 실시간 채팅, 날씨 조회 등 사용자 친화적인 O2O 하이브리드 기능을 탑재하고 있습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

* **Framework**: React Native (Expo SDK 51.x)
* **Language**: TypeScript
* **Navigation**: Expo Router
* **State Management**: React Context API, Redux Toolkit
* **Map & GPS**: React Native Maps / Expo Location
* **Network**: Axios / StompJS (WebSocket Client)
* **Design & Styling**: React Native StyleSheet (가변 기기 대응 UI)

---

## 📂 프로젝트 구조 (Architecture)

관심사 분리(SoC)와 재사용성을 극대화하기 위해 도메인 및 컴포넌트 단위로 모듈화했습니다.

```
src/
├── app/          # Expo Router 기반 네비게이션 트리 ((tabs), joins, login 등)
├── components/   # 공통 재사용 UI 컴포넌트 (WebView 인증 모듈, 프로필 모달 등)
├── contexts/     # 글로벌 상태 관리 (AuthContext, 위치 권한 컨텍스트 등)
├── api/          # Axios 인스턴스 설정 및 백엔드 통신 API 클라이언트 선언
├── store/        # Redux 전역 스탯 대시보드 데이터 슬라이스 관리
└── assets/       # 이미지, 폰트 등 정적 리소스 보관
```

---

## 🌟 주요 프론트엔드 기능 (Key Features)

### 1. 실시간 GPS 연동 & 카카오 지도 마커 시각화
* 기기 GPS 센서(`expo-location`)를 활성화해 사용자 반경의 위도·경도 좌표를 실시간 수집합니다.
* `react-native-maps`를 이식하여 주변의 스크린 골프장 목록을 핀 마커 형태로 맵 위에 시각화하고 직관적인 클릭/선택 인터랙션을 제공합니다.

### 2. 포트원 다날 본인인증 WebView 통합
* `react-native-webview`를 커스터마이징하여 하이브리드 WebView 기반의 포트원 다날 실명인증 모듈을 완벽히 이식했습니다.
* 인증 성공 콜백(`imp_uid`)을 감지하여 자동으로 회원가입 폼에 연동함으로써 신원 검증 프로세스를 모바일 앱에 매끄럽게 안착시켰습니다.

### 3. WebSocket STOMP 기반 실시간 양방향 채팅
* `stompjs`를 활용하여 모임 참가 확정자 전용 다대다 채팅 화면을 제공합니다.
* 백엔드 소켓 서버와의 연결 유실 시 자동으로 백그라운드 재연결을 시도하며, 양방향 메시지 송수신 및 즉각적인 UI 업데이트를 실현했습니다.

### 4. OpenWeather API 날씨 예보 위젯
* 사용자의 위경도 위치에 적합한 기상 데이터 및 온도를 OpenWeather API로부터 동적 페치(Fetch)합니다.
* 날씨 상태에 맞춘 위트 있는 라운딩 권장 문구 및 다이나믹 날씨 아이콘을 대시보드 메인 화면에 렌더링합니다.

---

## 🚨 프론트엔드 트러블슈팅 (Troubleshooting)

### 💥 지도 조작 프레임 드랍 및 마커 깜박임(Flickering) 개선
* **문제 상황**: 지도 조작(드래그, 확대/축소) 시 프레임 드랍과 함께 화면이 버벅거리고, 마커의 스타일(색상, 선택 레이어)이 바뀔 때 마커 핀들이 일시적으로 사라졌다 다시 그려지는 깜박임 버그가 나타남.
* **원인 분석**:
  1. 지도 이동 중 실시간 좌표값을 `useState`에 즉시 기록하여 불필요한 전체 렌더링이 과도하게 일어남.
  2. 마커의 고유 Key를 갱신할 때 인스턴스 아이덴티티가 유실되어 React가 마커 컴포넌트 전체를 완전히 소멸시킨 후 재생성(Destroy & Re-create)했기 때문.
* **해결 과정**:
  1. 지도가 움직이는 도중에는 렌더링을 유발하지 않는 **`useRef`** 변수에 좌표를 조용히 업데이트하고, 드래그가 끝난 시점(`onRegionChangeComplete`)의 영역 좌표만 가로채서 API 갱신에 사용하도록 설계함.
  2. 마커 컴포넌트 루프 시, 단순 ID 매핑을 넘어 **`key={`${center.id}-${selectedCenter?.id === center.id ? 'selected' : 'normal'}`}`**와 같이 고유 ID 뒤에 선택 상태 문자열을 동적으로 묶어 키 바인딩을 적용함.
* **결과**: 지도 드래그 제스처 시 불필요한 전체 리렌더링 부하를 100% 제거하여 부드러운 60fps 성능을 확보하였으며, 마커 상태 변경 시 깜박임 없이 지연 시간 없이 마운트와 업데이트가 즉각 완료되도록 버그를 해결함.

```tsx
// 💡 핵심 렌더링 최적화 코드
{centers.map((center) => (
  <Marker
    // 고유 ID + 선택 여부 조합의 동적 Key 부여로 깜박임 현상 해결
    key={`${center.id}-${selectedCenter?.id === center.id ? 'selected' : 'normal'}`}
    coordinate={{ latitude: center.latitude, longitude: center.longitude }}
    onPress={() => setSelectedCenter(center)}
    zIndex={selectedCenter?.id === center.id ? 999 : 1}
    pinColor={selectedCenter?.id === center.id ? '#1b4d3e' : '#2b8a3e'}
  />
))}
```

---

## 🚀 시작하기 (How to Run)

### 1. 의존성 패키지 설치
```bash
npm install
```

### 2. 환경 변수 파일 생성 (`.env`)
프로젝트 루트 경로에 `.env` 파일을 생성하고 필요한 API Key 및 백엔드 서버 주소를 기입합니다.
```env
EXPO_PUBLIC_API_URL=http://your_backend_ip:8080
EXPO_PUBLIC_OPENWEATHER_API_KEY=your_openweathermap_api_key
```

### 3. 애플리케이션 시작
```bash
# Expo 개발 서버 구동
npx expo start
```
`Expo Go` 앱 또는 에뮬레이터를 이용해 QR 코드를 스캔하여 실행합니다.
