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
  const [completedSettlementIds, setCompletedSettlementIds] = useState<string[]>([]);
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
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">イベントが見つかりません</h1>
          <p className="mt-3 text-sm text-slate-600">
            URLにイベント情報が含まれていないか、読み込みに失敗しました。
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
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
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-sm font-semibold tracking-wide text-slate-500">
                WaliWali
              </p>
              <h1 className="text-3xl font-bold tracking-tight">
                {eventData.eventName}
              </h1>
            </div>

            <button
              type="button"
              onClick={copyUrl}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              URLをコピー
            </button>
          </div>

          <p className="text-sm leading-6 text-slate-600">
            誰が支払い、誰の分だったのかまで記録できるイベントページです。
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold">支払いを追加</h2>
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
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-slate-700">
                  誰の分か
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllParticipants}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    全員選択
                  </button>
                  <button
                    type="button"
                    onClick={clearParticipants}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    解除
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {eventData.members.map((member) => {
                  const selected = participants.includes(member);

                  return (
                    <button
                      key={member}
                      type="button"
                      onClick={() => toggleParticipant(member)}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                        selected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {member}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">対象人数</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {participants.length}人
                </p>

                <p className="mt-3 text-sm text-slate-500">1人あたりの目安</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {previewPerPerson !== null
                    ? `${previewPerPerson.toLocaleString()}円`
                    : "—"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={addExpense}
              className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-semibold text-white transition hover:bg-slate-800"
            >
              支払いを追加
            </button>
          </div>
        </section>

        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">誰が誰に払うか</h2>
              <p className="text-sm text-slate-500">
                ここを見れば精算が完了できる
              </p>
            </div>

            <div className="text-right">
              <div className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
                未完了 {remainingCount}件
              </div>
              <p className="mt-2 text-xs text-slate-500">
                完了 {completedCount} / {totalSettlementCount}
              </p>
            </div>
          </div>

          {expenses.length === 0 || !settlementData ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              支払いを追加すると、ここに精算方法が表示されます。
            </div>
          ) : settlementData.settlements.length === 0 ? (
            <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-900">
              <p className="text-lg font-bold">送金は不要です</p>
              <p className="mt-2 text-sm">
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
                    className={`rounded-2xl border p-4 transition ${
                      isCompleted
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xl font-bold text-slate-900">
                          {row.from}
                          <span className="mx-2 text-slate-400">→</span>
                          {row.to}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          支払う金額
                        </p>
                        <p className="text-3xl font-bold text-slate-900">
                          {row.amount.toLocaleString()}円
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSettlementComplete(row.id)}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          isCompleted
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        }`}
                      >
                        {isCompleted ? "支払い完了" : "完了にする"}
                      </button>
                    </div>

                    {isCompleted && (
                      <p className="mt-3 text-sm font-medium text-emerald-700">
                        この送金は完了済みです。
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">支払い一覧</h2>
              <p className="text-sm text-slate-500">
                記録の確認・編集ができる
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                合計 {totalExpense.toLocaleString()}円
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseListOpen((prev) => !prev)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {isExpenseListOpen ? "閉じる" : "開く"}
              </button>
            </div>
          </div>

          {isExpenseListOpen && (
            <>
              {expenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
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
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        {!isEditing ? (
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-base font-bold text-slate-900">
                                {expense.title}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                支払った人: {expense.payer}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                対象: {expense.participants.join("・")}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                1人あたり目安: {amountPerPerson.toLocaleString()}円
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xl font-bold text-slate-900">
                                {Number(expense.amount).toLocaleString()}円
                              </p>
                              <div className="mt-2 flex justify-end gap-3">
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
                              <p className="text-base font-bold text-slate-900">
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
                                onChange={(e) => setEditingPayer(e.target.value)}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
                                onChange={(e) => setEditingAmount(e.target.value)}
                                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                              />
                            </div>

                            <div>
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="text-sm font-medium text-slate-700">
                                  誰の分か
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={selectAllEditingParticipants}
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    全員選択
                                  </button>
                                  <button
                                    type="button"
                                    onClick={clearEditingParticipants}
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                  >
                                    解除
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
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
                                      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                                        selected
                                          ? "border-slate-900 bg-slate-900 text-white"
                                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                      }`}
                                    >
                                      {member}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="mt-3 rounded-2xl bg-white p-4">
                                <p className="text-sm text-slate-500">対象人数</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">
                                  {editingParticipants.length}人
                                </p>

                                <p className="mt-3 text-sm text-slate-500">
                                  1人あたりの目安
                                </p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">
                                  {editingPreviewPerPerson !== null
                                    ? `${editingPreviewPerPerson.toLocaleString()}円`
                                    : "—"}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={saveEditingExpense}
                              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
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

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold">精算サマリー</h2>
            <p className="text-sm text-slate-500">
              実際に払った額と、本来負担すべき額の差を計算
            </p>
          </div>

          {expenses.length === 0 || !settlementData ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              支払いを追加すると、ここに精算結果が表示されます。
            </div>
          ) : (
            <div className="space-y-3">
              {settlementData.balances.map((row) => (
                <div
                  key={row.member}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-base font-bold text-slate-900">
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
                        className={`text-2xl font-bold ${
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
    </main>
  );
}