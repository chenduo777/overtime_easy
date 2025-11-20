# 學生打卡與加班管理系統

Node.js + MySQL 打卡系統，支援單鍵打卡、自動計算加班/遲到/早退，並提供排行榜功能。

## 功能特色

- 單一按鈕打卡（上班/下班自動判斷）
- 自動計算工作時間、加班時數、違規時數
- 平日遲到/早退自動判定
- 週末全部時間計為加班
- 個人統計與排行榜
- JWT 身份驗證

## 資料庫架構

### 六個實體（Entity）

1. **Student**（學生）
2. **AppAccount**（帳號）- 與 Student 1:1 關聯
3. **WorkDate**（工作日）
4. **AttendanceRecord**（出勤紀錄）- Student 與 WorkDate 的 M:N 中介表
5. **OvertimeSummary**（加班統計）
6. **ViolationSummary**（違規統計）

### 關係類型

- **1:1**：Student ↔ AppAccount
- **1:M**：Student → AttendanceRecord
- **M:N**：Student ↔ WorkDate（透過 AttendanceRecord）

### 商業規則

1. 每位學生具有唯一 StudentID，並且僅有一個對應的 AppAccount
2. 每位學生在多個日期可以產生多筆出勤紀錄
3. 紀錄每日第一次打卡為 ClockIn，之後所有打卡皆為 ClockOut
4. 平日上班時間為 10:00–20:00，晚到視為遲到，早退視為違規
5. 週六與週日所有工時皆視為加班

## 環境需求

- Node.js 14+
- MySQL 5.7+ 或 8.0+
- npm

## 安裝步驟

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 設定資料庫

編輯 `.env` 文件，填入你的資料庫資訊：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=overtime_easy
DB_PORT=3306

JWT_SECRET=your-secret-key

PORT=3000
```

### 3. 建立資料庫結構

```bash
# 登入 MySQL
mysql -u root -p

# 執行資料庫 schema
source database/schema.sql
```

或直接匯入：

```bash
mysql -u root -p < database/schema.sql
```

### 4. 啟動伺服器

```bash
# 開發模式（需安裝 nodemon）
npm run dev

# 正式模式
npm start
```

伺服器預設運行於：`http://localhost:3000`

## API 文件

### 驗證相關（/api/auth）

#### 註冊

```http
POST /api/auth/register
Content-Type: application/json

{
  "studentId": "S001",
  "name": "王小明",
  "password": "password123"
}
```

#### 登入

```http
POST /api/auth/login
Content-Type: application/json

{
  "studentId": "S001",
  "password": "password123"
}
```

回應：

```json
{
  "message": "登入成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": {
    "studentId": "S001",
    "name": "王小明"
  }
}
```

#### 取得個人資料

```http
GET /api/auth/profile
Authorization: Bearer {token}
```

### 打卡相關（/api/attendance）

所有請求需要在 Header 加上 `Authorization: Bearer {token}`

#### 單鍵打卡

```http
POST /api/attendance/clock
Authorization: Bearer {token}
```

第一次打卡（上班）回應：

```json
{
  "message": "上班打卡成功",
  "action": "clock_in",
  "recordId": 1,
  "clockIn": "09:30:00",
  "date": "2025-01-15"
}
```

第二次打卡（下班）回應：

```json
{
  "message": "下班打卡成功",
  "action": "clock_out",
  "recordId": 1,
  "clockIn": "09:30:00",
  "clockOut": "20:30:00",
  "workMinutes": 660,
  "overtimeMinutes": 60,
  "violationMinutes": 0,
  "isHoliday": false
}
```

#### 查詢今日打卡狀態

```http
GET /api/attendance/today
Authorization: Bearer {token}
```

#### 查詢出勤紀錄

```http
GET /api/attendance/records?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

### 統計相關（/api/stats）

#### 個人統計

```http
GET /api/stats/my?period=2025-01
Authorization: Bearer {token}
```

#### 加班排行榜

```http
GET /api/stats/leaderboard/overtime?period=2025-01&limit=10
Authorization: Bearer {token}
```

#### 違規排行榜

```http
GET /api/stats/leaderboard/violation?period=2025-01&limit=10
Authorization: Bearer {token}
```

#### 綜合排行榜（淨工時）

```http
GET /api/stats/leaderboard/combined?period=2025-01&limit=10
Authorization: Bearer {token}
```

#### 系統總覽

```http
GET /api/stats/overview
Authorization: Bearer {token}
```

## 工時計算邏輯

### 平日（週一至週五）

- 標準工時：10:00 - 20:00
- **遲到**：ClockIn > 10:00
- **早退**：ClockOut < 20:00
- **加班**：
  - 早到：ClockIn < 10:00
  - 晚走：ClockOut > 20:00

### 假日（週六、週日）

- 所有工時皆為加班

### 範例

**平日 09:00 打卡上班，21:00 打卡下班：**

- 工作時間：12 小時
- 加班時數：1 小時（早到）+ 1 小時（晚走）= 2 小時
- 違規時數：0

**平日 10:30 打卡上班，19:00 打卡下班：**

- 工作時間：8.5 小時
- 加班時數：0
- 違規時數：0.5 小時（遲到）+ 1 小時（早退）= 1.5 小時

**週六 10:00 打卡上班，18:00 打卡下班：**

- 工作時間：8 小時
- 加班時數：8 小時（全部為加班）
- 違規時數：0

## 專案結構

```
overtime_easy/
├── config/
│   └── database.js          # 資料庫連接配置
├── controllers/
│   ├── authController.js    # 驗證控制器
│   ├── attendanceController.js  # 打卡控制器
│   └── statsController.js   # 統計控制器
├── routes/
│   ├── auth.js              # 驗證路由
│   ├── attendance.js        # 打卡路由
│   └── stats.js             # 統計路由
├── middleware/
│   └── auth.js              # JWT 驗證中間件
├── database/
│   └── schema.sql           # 資料庫結構
├── .env                     # 環境變數配置
├── .env.example             # 環境變數範例
├── server.js                # 主程式
├── package.json
└── README.md

```

## AWS RDS 部署（可選）

### 1. 建立 AWS RDS MySQL 實例

1. 登入 AWS 控制台
2. 進入 RDS 服務
3. 選擇「建立資料庫」
4. 選擇 MySQL，選擇免費方案（Free tier）
5. 設定資料庫名稱、帳號、密碼
6. 在「連線」設定中，允許公開存取
7. 在安全群組中開放 3306 port

### 2. 取得連線資訊

在 RDS 實例詳細資訊中找到：

- 端點（Endpoint）：`your-db.xxxxx.ap-northeast-1.rds.amazonaws.com`
- 連接埠：`3306`

### 3. 更新 .env 配置

```env
DB_HOST=your-db.xxxxx.ap-northeast-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-password
DB_NAME=overtime_easy
DB_PORT=3306
```

### 4. 匯入資料庫結構

```bash
mysql -h your-db.xxxxx.ap-northeast-1.rds.amazonaws.com -u admin -p < database/schema.sql
```

## 測試建議

使用 Postman 或 curl 進行 API 測試：

```bash
# 1. 註冊
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"studentId":"S001","name":"王小明","password":"test123"}'

# 2. 登入
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"studentId":"S001","password":"test123"}'

# 3. 打卡（將 {token} 替換為登入後取得的 token）
curl -X POST http://localhost:3000/api/attendance/clock \
  -H "Authorization: Bearer {token}"

# 4. 查看今日狀態
curl -X GET http://localhost:3000/api/attendance/today \
  -H "Authorization: Bearer {token}"

# 5. 查看個人統計
curl -X GET http://localhost:3000/api/stats/my \
  -H "Authorization: Bearer {token}"
```

## 前端整合建議

### 網頁版

可使用 React、Vue 或純 HTML/CSS/JavaScript 建立前端介面。

### 手機 App

可使用以下框架：

- React Native
- Flutter
- Ionic

範例請求（JavaScript）：

```javascript
// 登入
const login = async (studentId, password) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
};

// 打卡
const clockInOut = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/api/attendance/clock', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};
```

## 授權

ISC

## 作者

學生打卡系統開發團隊