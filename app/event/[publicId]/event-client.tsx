"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: number;
  name: string;
};

type ExpenseItem = {
  id: number;
  payerMemberId: number;
  payerName: string;
  title: string;
  amount: number;
  participants: {
    memberId: number;
    name: string;
  }[];
};

type SettlementItem = {
  fromMemberId: number;
  fromName: string;
  toMemberId: number;
  toName: string;
  amount: number;
  isCompleted: boolean;
};

type BalanceItem = {
  memberId: number;
  name: string;
  balance: number;
};

type Props = {
  publicId: string;
  eventName: string;
  members: Member[];
  expenses: ExpenseItem[];
  balances: BalanceItem[];
  settlements: SettlementItem[];
};

export default function EventClient({
  publicId,
  eventName,
  members,
  expenses,
  balances,
  settlements,
}: Props) {
  const router = useRouter();

  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingPayerMemberId, setEditingPayerMemberId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingAmount, setEditingAmount] = useState("");
  const [editingParticipantMemberIds, setEditingParticipantMemberIds] = useState<number[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isTogglingSettlementKey, setIsTogglingSettlementKey] = useState<string | null>(null);
  const [isDeletingExpenseId, setIsDeletingExpenseId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const [isSettlementOpen, setIsSettlementOpen] = useState(true);
  const [isExpenseListOpen, setIsExpenseListOpen] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const startEdit = (expense: ExpenseItem) => {
    setEditingExpenseId(expense.id);
    setEditingPayerMemberId(String(expense.payerMemberId));
    setEditingTitle(expense.title);
    setEditingAmount(String(expense.amount));
    setEditingParticipantMemberIds(expense.participants.map((p) => p.memberId));
    setIsExpenseListOpen(true);
  };

  const cancelEdit = () => {
    setEditingExpenseId(null);
    setEditingPayerMemberId("");
    setEditingTitle("");
    setEditingAmount("");
    setEditingParticipantMemberIds([]);
  };

  const toggleEditingParticipant = (memberId: number) => {
    setEditingParticipantMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllEditingParticipants = () => {
    setEditingParticipantMemberIds(members.map((member) => member.id));
  };

  const clearEditingParticipants = () => {
    setEditingParticipantMemberIds([]);
  };

  const editingNumericAmount = useMemo(() => Number(editingAmount), [editingAmount]);

  const editingPreviewPerPerson =
    editingParticipantMemberIds.length > 0 &&
    Number.isFinite(editingNumericAmount) &&
    editingNumericAmount > 0
      ? Math.ceil(editingNumericAmount / editingParticipantMemberIds.length)
      : null;

  const sortedSettlements = useMemo(() => {
    return [...settlements].sort((a, b) => {
      if (a.isCompleted === b.isCompleted) return 0;
      return a.isCompleted ? 1 : -1;
    });
  }, [settlements]);

  const completedSettlementCount = useMemo(() => {
    return settlements.filter((settlement) => settlement.isCompleted).length;
  }, [settlements]);

  const totalSettlementCount = settlements.length;

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error(error);
      alert("URLのコピーに失敗しました");
    }
  };

  const saveEdit = async () => {
    if (editingExpenseId === null || isSavingEdit) return;

    const payerMemberId = Number(editingPayerMemberId);
    const amount = Number(editingAmount);

    if (!Number.isInteger(payerMemberId) || !editingTitle.trim()) {
      alert("支払った人と内容を入力してください");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("金額を正しく入力してください");
      return;
    }

    if (editingParticipantMemberIds.length === 0) {
      alert("対象メンバーを1人以上選んでください");
      return;
    }

    try {
      setIsSavingEdit(true);

      const res = await fetch(
        `/api/events/${publicId}/expenses/${editingExpenseId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            payerMemberId,
            title: editingTitle.trim(),
            amount,
            participantMemberIds: editingParticipantMemberIds,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.message ?? "支払い編集に失敗しました");
        return;
      }

      cancelEdit();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("支払い編集に失敗しました");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deleteExpense = async (expenseId: number) => {
    if (isDeletingExpenseId !== null) return;

    const confirmed = window.confirm("この支払いを削除しますか？");
    if (!confirmed) return;

    try {
      setIsDeletingExpenseId(expenseId);

      const res = await fetch(`/api/events/${publicId}/expenses/${expenseId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.message ?? "支払い削除に失敗しました");
        return;
      }

      if (editingExpenseId === expenseId) {
        cancelEdit();
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("支払い削除に失敗しました");
    } finally {
      setIsDeletingExpenseId(null);
    }
  };

  const toggleSettlementComplete = async (settlement: SettlementItem) => {
    const key = `${settlement.fromMemberId}-${settlement.toMemberId}-${settlement.amount}`;
    if (isTogglingSettlementKey) return;

    try {
      setIsTogglingSettlementKey(key);

      const res = await fetch(`/api/events/${publicId}/settlements/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromMemberId: settlement.fromMemberId,
          toMemberId: settlement.toMemberId,
          amount: settlement.amount,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.message ?? "完了状態の更新に失敗しました");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("完了状態の更新に失敗しました");
    } finally {
      setIsTogglingSettlementKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-cyan-200 bg-white/85 p-6 shadow-[0_16px_46px_rgba(14,116,144,0.10)] backdrop-blur">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-cyan-700">
              {eventName}
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              誰が誰に払うか
            </h2>
            <p className="text-sm text-slate-500">
              まずここを見れば、今必要な送金がわかる
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={copyCurrentUrl}
              className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.24)]"
            >
              {copied ? "コピー済み" : "URLをコピー"}
            </button>

            <p className="text-xs text-slate-500">
              完了 {completedSettlementCount} / {totalSettlementCount}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSettlementOpen((prev) => !prev)}
          className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          {isSettlementOpen ? "閉じる" : "開く"}
        </button>

        {isSettlementOpen && (
          <>
            {sortedSettlements.length === 0 ? (
              <div className="rounded-[24px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 text-emerald-900 shadow-[0_10px_24px_rgba(16,185,129,0.10)]">
                <p className="text-lg font-black">送金は不要です</p>
                <p className="mt-2 text-sm leading-6">
                  すでに全員の負担がちょうど釣り合っています。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedSettlements.map((row, index) => {
                  const key = `${row.fromMemberId}-${row.toMemberId}-${row.amount}`;

                  return (
                    <div
                      key={`${key}-${index}`}
                      className={`rounded-[24px] border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ${
                        row.isCompleted
                          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xl font-black text-slate-900">
                            {row.fromName}
                            <span className="mx-2 text-slate-400">→</span>
                            {row.toName}
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
                          onClick={() => toggleSettlementComplete(row)}
                          disabled={isTogglingSettlementKey === key}
                          className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                            row.isCompleted
                              ? "bg-emerald-600 text-white shadow-[0_10px_20px_rgba(5,150,105,0.20)] hover:bg-emerald-700"
                              : "bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.24)]"
                          } disabled:opacity-50`}
                        >
                          {isTogglingSettlementKey === key
                            ? "更新中..."
                            : row.isCompleted
                            ? "支払い完了"
                            : "完了にする"}
                        </button>
                      </div>

                      {row.isCompleted && (
                        <p className="mt-3 text-sm font-semibold text-emerald-700">
                          この送金は完了済みです。
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">支払い一覧</h2>
            <p className="text-sm text-slate-500">追加した支払いを時系列で表示</p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpenseListOpen((prev) => !prev)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {isExpenseListOpen ? "閉じる" : "開く"}
          </button>
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
                              支払った人: {expense.payerName}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              対象:{" "}
                              {expense.participants.map((p) => p.name).join("・")}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <p className="text-2xl font-black text-slate-900">
                              {expense.amount.toLocaleString()}円
                            </p>
                            <div className="mt-2 flex gap-3 sm:justify-end">
                              <button
                                type="button"
                                onClick={() => startEdit(expense)}
                                className="text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteExpense(expense.id)}
                                className="text-sm font-semibold text-rose-500 transition hover:text-rose-700"
                              >
                                {isDeletingExpenseId === expense.id
                                  ? "削除中..."
                                  : "削除"}
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
                              onClick={cancelEdit}
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
                              value={editingPayerMemberId}
                              onChange={(e) =>
                                setEditingPayerMemberId(e.target.value)
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                            >
                              <option value="">選択してください</option>
                              {members.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name}
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
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
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
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
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
                              {members.map((member) => {
                                const selected =
                                  editingParticipantMemberIds.includes(member.id);

                                return (
                                  <button
                                    key={member.id}
                                    type="button"
                                    onClick={() =>
                                      toggleEditingParticipant(member.id)
                                    }
                                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                                      selected
                                        ? "border-cyan-600 bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-[0_8px_20px_rgba(14,116,144,0.25)]"
                                        : "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                                    }`}
                                  >
                                    {member.name}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                              <p className="text-sm text-slate-500">対象人数</p>
                              <p className="mt-1 text-xl font-black text-slate-900">
                                {editingParticipantMemberIds.length}人
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
                            onClick={saveEdit}
                            disabled={isSavingEdit}
                            className="w-full rounded-[24px] bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.24)] disabled:opacity-50"
                          >
                            {isSavingEdit ? "保存中..." : "編集を保存"}
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

      <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">精算サマリー</h2>
            <p className="text-sm text-slate-500">
              実際に払った額と、本来負担すべき額の差額
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSummaryOpen((prev) => !prev)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {isSummaryOpen ? "閉じる" : "開く"}
          </button>
        </div>

        {isSummaryOpen && (
          <>
            {balances.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 text-sm text-slate-500">
                まだ精算データがありません。
              </div>
            ) : (
              <div className="space-y-3">
                {balances.map((row) => (
                  <div
                    key={row.memberId}
                    className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-black text-slate-900">
                          {row.name}
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
          </>
        )}
      </section>
    </div>
  );
}