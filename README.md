# 💸 WaliWali - 割り勘管理アプリ

複数人での支払いを簡単に管理し、誰が誰にいくら払うべきかを自動で計算するアプリです。

---

## 🌐 デモ

https://waliwali-app.vercel.app

---

## ✨ 主な機能

### 🧾 支払いの追加
- 誰が支払ったか
- 金額
- 参加者  
を入力するだけで記録

### 👥 メンバー管理
- イベントごとにメンバーを管理
- 重複排除・入力補助あり

### 🔄 自動精算ロジック
- 支払い履歴から最適な支払い関係を算出
- 「誰が誰にいくら払うか」を可視化

### ✅ 支払い完了チェック
- 清算済みをトグルで管理

### 🔗 URL共有
- イベント単位でURLを共有
- 同じページで更新可能

---

## 🧠 清算ロジック

1. 各メンバーの収支を計算（balance）
2. プラス（受け取り）とマイナス（支払い）を分離
3. 最小回数になるようマッチング

---

## 🛠 技術スタック

### Frontend
- Next.js 16 (App Router)
- React
- Tailwind CSS

### Backend
- Next.js Route Handler
- Prisma ORM

### Database
- PostgreSQL (Supabase)

### Hosting
- Vercel
