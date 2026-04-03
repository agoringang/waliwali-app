"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ShareEventData = {
  eventName: string;
  members: string[];
};

type Expense = {
  id: number;
  payer: string;
  title: string;
  amount: string;
  participants: string[];
};

type BalanceRow = {
  member: string;
  paid: number;
  owed: number;
  balance: number;
};

type SettlementRow = {
  from: string;
  to: string;
  amount: number;
};

type SettlementWithId = SettlementRow & {
  id: string;
};

export default function EventPage() {
  const searchParams = useSearchParams();

  const eventData = useMemo(() => {
    const raw = searchParams.get("data");
    if (!raw) return null;

    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as ShareEventData;

      if (
        typeof parsed.eventName !== "string" ||
        !Array.isArray(parsed.members)
      ) {
        return null;
      }

      return {
        eventName: parsed.eventName,
        members: parsed.members.filter(
          (member) => typeof member === "string" && member.trim().length > 0
        ),
      };
    } catch {
      return null;
    }
  }, [searchParams]);

  const [payer, setPayer] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [completedSettlementIds, setCompletedSettlementIds] = useState<string[]>(
    []
  );
  const [isExpenseListOpen, setIsExpenseListOpen] = useState(true);

  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingPayer, setEditingPayer] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingAmount, setEditingAmount] = useState("");
  const [editingParticipants, setEditingParticipants] = useState<string[]>([]);

  const totalExpense = useMemo(() => {
    return expenses.reduce((sum, expense) => {
      const value = Number(expense.amount);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [expenses]);

  const settlementData = useMemo(() => {
    if (!eventData) return null;

    const memberMap = new Map<string, { paid: number; owed: number }>();

    for (const member of eventData.members) {
      memberMap.set(member, { paid: 0, owed: 0 });
    }

    for (const expense of expenses) {
      const numericAmount = Number(expense.amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) continue;
      if (!expense.participants.length) continue;

      const payerRow = memberMap.get(expense.payer);
      if (payerRow) {
        payerRow.paid += numericAmount;
      }

      const share = numericAmount / expense.participants.length;

      for (const participant of expense.participants) {
        const participantRow = memberMap.get(participant);
        if (participantRow) {
          participantRow.owed += share;
        }
      }
    }

    const balances: BalanceRow[] = eventData.members.map((member) => {
      const row = memberMap.get(member)!;
      const paid = Math.round(row.paid);
      const owed = Math.round(row.owed);
      const balance = paid - owed;

      return {
        member,
        paid,
        owed,
        balance,
      };
    });

    const creditors = balances
      .filter((row) => row.balance > 0)
      .map((row) => ({
        member: row.member,
        amount: row.balance,
      }));

    const debtors = balances
      .filter((row) => row.balance < 0)
      .map((row) => ({
        member: row.member,
        amount: Math.abs(row.balance),
      }));

    const settlements: SettlementWithId[] = [];

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const transferAmount = Math.min(debtor.amount, creditor.amount);

      if (transferAmount > 0) {
        settlements.push({
          id: `${debtor.member}->${creditor.member}:${transferAmount}`,
          from: debtor.member,
          to: creditor.member,
          amount: transferAmount,
        });
      }

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;

      if (debtor.amount === 0) i += 1;
      if (creditor.amount === 0) j += 1;
    }

    return {
      balances,
      settlements,
    };
  }, [eventData, expenses]);

  const activeSettlementIds = useMemo(() => {
    return settlementData?.settlements.map((row) => row.id) ?? [];
  }, [settlementData]);

  const normalizedCompletedIds = useMemo(() => {
    return completedSettlementIds.filter((id) => activeSettlementIds.includes(id));
  }, [completedSettlementIds, activeSettlementIds]);

  const completedCount = normalizedCompletedIds.length;
  const totalSettlementCount = settlementData?.settlements.length ?? 0;
  const remainingCount = totalSettlementCount - completedCount;

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "";

  const copyUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    alert("共有URLをコピーしました");
  };

  const toggleParticipant = (member: string) => {
    setParticipants((prev) =>
      prev.includes(member)
        ? prev.filter((name) => name !== member)
        : [...prev, member]
    );
  };

  const selectAllParticipants = () => {
    if (!eventData) return;
    setParticipants(eventData.members);
  };

  const clearParticipants = () => {
    setParticipants([]);
  };

  const toggleEditingParticipant = (member: string) => {
    setEditingParticipants((prev) =>
      prev.includes(member)
        ? prev.filter((name) => name !== member)
        : [...prev, member]
    );
  };

  const selectAllEditingParticipants = () => {
    if (!eventData) return;
    setEditingParticipants(eventData.members);
  };

  const clearEditingParticipants = () => {
    setEditingParticipants([]);
  };

  const toggleSettlementComplete = (id: string) => {
    setCompletedSettlementIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const addExpense = () => {
    const trimmedPayer = payer.trim();
    const trimmedTitle = title.trim();
    const numericAmount = Number(amount);

    if (!trimmedPayer || !trimmedTitle) return;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;
    if (participants.length === 0) return;

    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now(),
        payer: trimmedPayer,
        title: trimmedTitle,
        amount: String(numericAmount),
        participants,
      },
    ]);

    setTitle("");
    setAmount("");
    setParticipants([]);
    setCompletedSettlementIds([]);
  };

  const removeExpense = (id: number) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
    setCompletedSettlementIds([]);
    if (editingExpenseId === id) {
      setEditingExpenseId(null);
      setEditingPayer("");
      setEditingTitle("");
      setEditingAmount("");
      setEditingParticipants([]);
    }
  };

  const startEditingExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditingPayer(expense.payer);
    setEditingTitle(expense.title);
    setEditingAmount(expense.amount);
    setEditingParticipants(expense.participants);
    setIsExpenseListOpen(true);
  };

  const cancelEditingExpense = () => {
    setEditingExpenseId(null);
    setEditingPayer("");
    setEditingTitle("");
    setEditingAmount("");
    setEditingParticipants([]);
  };

  const saveEditingExpense = () => {
    if (editingExpenseId === null) return;

    const trimmedPayer = editingPayer.trim();
    const trimmedTitle = editingTitle.trim();
    const numericAmount = Number(editingAmount);

    if (!trimmedPayer || !trimmedTitle) return;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;
    if (editingParticipants.length === 0) return;

    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === editingExpenseId
          ? {
              ...expense,
              payer: trimmedPayer,
              title: trimmedTitle,
              amount: String(numericAmount),
              participants: editingParticipants,
            }
          : expense
      )
    );

    setCompletedSettlementIds([]);
    cancelEditingExpense();
  };

  if (!eventData) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fffe,_#eef6ff_45%,_#f6f7fb_100%)] px-4 py-8 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <h1 className="text-2xl font-black text-slate-900">
            イベントが見つかりません
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            URLにイベント情報が含まれていないか、読み込みに失敗しました。
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.24)]"
          >
            イベント作成に戻る
          </Link>
        </div>
      </main>
    );
  }

  const payerOptions = eventData.members;
  const numericAmount = Number(amount);
  const previewPerPerson =
    participants.length > 0 && Number.isFinite(numericAmount) && numericAmount > 0
      ? Math.ceil(numericAmount / participants.length)
      : null;

  const editingNumericAmount = Number(editingAmount);
  const editingPreviewPerPerson =
    editingParticipants.length > 0 &&
    Number.isFinite(editingNumericAmount) &&
    editingNumericAmount > 0
      ? Math.ceil(editingNumericAmount / editingParticipants.length)
      : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fffe,_#eef6ff_45%,_#f6f7fb_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-200/50 blur-3xl" />
          <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-indigo-200/40 blur-3xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-cyan-700">
                WaliWali
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {eventData.eventName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                誰が支払い、誰の分だったのかまで記録できるイベントページです。
              </p>
            </div>

            <button
              type="button"
              onClick={copyUrl}
              className="shrink-0 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.24)]"
            >
              URLをコピー
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black text-slate-900">
                  支払いを追加
                </h2>
                <p className="text-sm text-slate-500">
                  まずはここから入力する
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    支払った人
                  </label>
                  <select
                    value={payer}
                    onChange={(e) => setPayer(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  >
                    <option value="">選択してください</option>
                    {payerOptions.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    内容
                  </label>
                  <input
                    type="text"
                    placeholder="例: 居酒屋代"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] placeholder:text-slate-400 outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    金額
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="例: 12000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] placeholder:text-slate-400 outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  />
                </div>

                <div>
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      誰の分か
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllParticipants}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        全員選択
                      </button>
                      <button
                        type="button"
                        onClick={clearParticipants}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        解除
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {eventData.members.map((member) => {
                      const selected = participants.includes(member);

                      return (
                        <button
                          key={member}
                          type="button"
                          onClick={() => toggleParticipant(member)}
                          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                            selected
                              ? "border-cyan-600 bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-[0_8px_20px_rgba(14,116,144,0.25)]"
                              : "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                          }`}
                        >
                          {member}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-sm text-slate-500">対象人数</p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                      {participants.length}人
                    </p>

                    <p className="mt-3 text-sm text-slate-500">
                      1人あたりの目安
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                      {previewPerPerson !== null
                        ? `${previewPerPerson.toLocaleString()}円`
                        : "—"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addExpense}
                  className="w-full rounded-[24px] bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 px-4 py-4 text-base font-black text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.24)]"
                >
                  支払いを追加
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-cyan-200 bg-white/85 p-5 shadow-[0_16px_46px_rgba(14,116,144,0.10)] backdrop-blur sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    誰が誰に払うか
                  </h2>
                  <p className="text-sm text-slate-500">
                    ここを見れば精算が完了できる
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <div className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-3 py-1 text-sm font-bold text-white shadow-[0_8px_20px_rgba(14,116,144,0.22)]">
                    未完了 {remainingCount}件
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    完了 {completedCount} / {totalSettlementCount}
                  </p>
                </div>
              </div>

              {expenses.length === 0 || !settlementData ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 text-sm text-slate-500">
                  支払いを追加すると、ここに精算方法が表示されます。
                </div>
              ) : settlementData.settlements.length === 0 ? (
                <div className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 text-emerald-900 shadow-[0_10px_24px_rgba(16,185,129,0.10)]">
                  <p className="text-lg font-black">送金は不要です</p>
                  <p className="mt-2 text-sm leading-6">
                    すでに全員の負担がちょうど釣り合っています。
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {settlementData.settlements.map((row) => {
                    const isCompleted = normalizedCompletedIds.includes(row.id);

                    return (
                      <div
                        key={row.id}
                        className={`rounded-[24px] border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition ${
                          isCompleted
                            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xl font-black text-slate-900">
                              {row.from}
                              <span className="mx-2 text-slate-400">→</span>
                              {row.to}
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                              支払う金額
                            </p>
                            <p className="text-3xl font-black tracking-tight text-slate-900">
                              {row.amount.toLocaleString()}円
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleSettlementComplete(row.id)}
                            className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                              isCompleted
                                ? "bg-emerald-600 text-white shadow-[0_10px_20px_rgba(5,150,105,0.20)] hover:bg-emerald-700"
                                : "bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.24)]"
                            }`}
                          >
                            {isCompleted ? "支払い完了" : "完了にする"}
                          </button>
                        </div>

                        {isCompleted && (
                          <p className="mt-3 text-sm font-semibold text-emerald-700">
                            この送金は完了済みです。
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    支払い一覧
                  </h2>
                  <p className="text-sm text-slate-500">
                    記録の確認・編集ができる
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-sm font-bold text-cyan-700">
                    合計 {totalExpense.toLocaleString()}円
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsExpenseListOpen((prev) => !prev)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    {isExpenseListOpen ? "閉じる" : "開く"}
                  </button>
                </div>
              </div>

              {isExpenseListOpen && (
                <>
                  {expenses.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 text-sm text-slate-500">
                      まだ支払いは追加されていません。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expenses.map((expense) => {
                        const amountPerPerson = Math.ceil(
                          Number(expense.amount) / expense.participants.length
                        );
                        const isEditing = editingExpenseId === expense.id;

                        return (
                          <div
                            key={expense.id}
                            className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
                          >
                            {!isEditing ? (
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-base font-black text-slate-900">
                                    {expense.title}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    支払った人: {expense.payer}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    対象: {expense.participants.join("・")}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    1人あたり目安:{" "}
                                    {amountPerPerson.toLocaleString()}円
                                  </p>
                                </div>

                                <div className="text-left sm:text-right">
                                  <p className="text-2xl font-black text-slate-900">
                                    {Number(expense.amount).toLocaleString()}円
                                  </p>
                                  <div className="mt-2 flex gap-3 sm:justify-end">
                                    <button
                                      type="button"
                                      onClick={() => startEditingExpense(expense)}
                                      className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                                    >
                                      編集
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeExpense(expense.id)}
                                      className="text-sm font-semibold text-rose-500 transition hover:text-rose-700"
                                    >
                                      削除
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-base font-black text-slate-900">
                                    支払いを編集
                                  </p>
                                  <button
                                    type="button"
                                    onClick={cancelEditingExpense}
                                    className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                                  >
                                    キャンセル
                                  </button>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-700">
                                    支払った人
                                  </label>
                                  <select
                                    value={editingPayer}
                                    onChange={(e) =>
                                      setEditingPayer(e.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                                  >
                                    <option value="">選択してください</option>
                                    {payerOptions.map((member) => (
                                      <option key={member} value={member}>
                                        {member}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-700">
                                    内容
                                  </label>
                                  <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={(e) =>
                                      setEditingTitle(e.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-700">
                                    金額
                                  </label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min="0"
                                    value={editingAmount}
                                    onChange={(e) =>
                                      setEditingAmount(e.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                                  />
                                </div>

                                <div>
                                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <label className="text-sm font-medium text-slate-700">
                                      誰の分か
                                    </label>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={selectAllEditingParticipants}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                      >
                                        全員選択
                                      </button>
                                      <button
                                        type="button"
                                        onClick={clearEditingParticipants}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                                      >
                                        解除
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-2.5">
                                    {eventData.members.map((member) => {
                                      const selected =
                                        editingParticipants.includes(member);

                                      return (
                                        <button
                                          key={member}
                                          type="button"
                                          onClick={() =>
                                            toggleEditingParticipant(member)
                                          }
                                          className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                                            selected
                                              ? "border-cyan-600 bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-[0_8px_20px_rgba(14,116,144,0.25)]"
                                              : "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                                          }`}
                                        >
                                          {member}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                                    <p className="text-sm text-slate-500">
                                      対象人数
                                    </p>
                                    <p className="mt-1 text-xl font-black text-slate-900">
                                      {editingParticipants.length}人
                                    </p>

                                    <p className="mt-3 text-sm text-slate-500">
                                      1人あたりの目安
                                    </p>
                                    <p className="mt-1 text-xl font-black text-slate-900">
                                      {editingPreviewPerPerson !== null
                                        ? `${editingPreviewPerPerson.toLocaleString()}円`
                                        : "—"}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={saveEditingExpense}
                                  className="w-full rounded-[24px] bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.24)]"
                                >
                                  編集を保存
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-black text-slate-900">
                  精算サマリー
                </h2>
                <p className="text-sm text-slate-500">
                  実際に払った額と、本来負担すべき額の差を計算
                </p>
              </div>

              {expenses.length === 0 || !settlementData ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 text-sm text-slate-500">
                  支払いを追加すると、ここに精算結果が表示されます。
                </div>
              ) : (
                <div className="space-y-3">
                  {settlementData.balances.map((row) => (
                    <div
                      key={row.member}
                      className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-base font-black text-slate-900">
                            {row.member}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            支払った額: {row.paid.toLocaleString()}円
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            負担額: {row.owed.toLocaleString()}円
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-slate-500">差額</p>
                          <p
                            className={`text-2xl font-black ${
                              row.balance > 0
                                ? "text-emerald-600"
                                : row.balance < 0
                                ? "text-rose-600"
                                : "text-slate-900"
                            }`}
                          >
                            {row.balance > 0 ? "+" : ""}
                            {row.balance.toLocaleString()}円
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}