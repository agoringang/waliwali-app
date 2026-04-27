# WaliWali

WaliWali は、イベント単位で立替と割り勘を管理する Next.js アプリです。  
飲み会、旅行、共同購入などの支払いを記録し、最終的に「誰が誰へいくら払うか」まで自動で計算します。

## Demo

https://waliwali-app.vercel.app

## 主な機能

- イベント作成
  イベント名とメンバーを入力すると、共有用 URL 付きのイベントを作成できます。
- 支払い記録
  誰が、何に、いくら支払ったかをイベント単位で記録できます。
- 割り勘方法の切り替え
  参加者での均等割りと、参加者ごとの個別金額入力の両方に対応しています。
- 支払いの編集と削除
  登録済みの支払いは後から更新・削除できます。
- 自動精算
  支払い履歴から各メンバーの収支を計算し、最小限の送金関係に整理します。
- 精算完了の管理
  精算ごとに完了状態をトグルで管理できます。
- URL 共有
  イベントページの URL をそのまま共有して、同じ内容を複数人で確認できます。

## 技術スタック

- Next.js 16.2.2
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- PostgreSQL
- Vercel

## ローカル起動

1. 依存関係をインストールします。

```bash
npm install
```

2. `.env` を作成し、DB 接続情報を設定します。

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

- `DATABASE_URL`
  アプリ実行時に使う接続文字列です。
- `DIRECT_URL`
  Prisma CLI がマイグレーション実行時に使う接続文字列です。

3. マイグレーションを適用します。

```bash
npx prisma migrate dev
```

4. 開発サーバーを起動します。

```bash
npm run dev
```

5. `http://localhost:3000` を開きます。

## スクリプト

- `npm run dev`
  開発サーバーを起動します。
- `npm run build`
  Prisma Client を生成してから本番ビルドします。
- `npm run start`
  本番ビルド済みアプリを起動します。
- `npm run lint`
  ESLint を実行します。

## データ構成

- `Event`
  イベント本体。共有用の `publicId` を持ちます。
- `Member`
  イベントに属する参加メンバーです。
- `Expense`
  立替の記録です。支払者、タイトル、金額を持ちます。
- `ExpenseParticipant`
  各支払いに対する参加者ごとの負担額を保持します。
- `SettlementCompletion`
  計算結果として出た精算の完了状態を保持します。

## 精算ロジック

1. 支払者には立替総額を加算します。
2. 参加者にはそれぞれの負担額を減算します。
3. 収支がプラスの人とマイナスの人を突き合わせます。
4. 必要な送金関係を順に作り、精算一覧を生成します。

均等割りでは、1 円単位の端数を自動で配分して合計金額と一致させています。

## 主なディレクトリ

- `app/`
  画面と Route Handler を持つ App Router 構成です。
- `src/lib/`
  Prisma 接続、精算計算、負担額計算などのロジックを置いています。
- `prisma/`
  Prisma schema とマイグレーションを管理しています。
