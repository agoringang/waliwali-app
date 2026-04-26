"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buildEqualParticipantShares,
  formatSignedYen,
  isEqualParticipantShares,
} from "../../../src/lib/expense-shares";
import ExpenseForm from "./expense-form";
import ParticipantShareEditor, {
  type SplitMode,
} from "./participant-share-editor";

type Member = {
  id: number;
  name: string;
};

type ExpenseParticipant = {
  memberId: number;
  name: string;
  shareAmount: number;
};

type ExpenseItem = {
  id: number;
  payerMemberId: number;
  payerName: string;
  title: string;
  amount: number;
  participants: ExpenseParticipant[];
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

type TabId = "overview" | "expenses" | "settlements";

const tabItems: { id: TabId; label: string; detail: string }[] = [
  { id: "overview", label: "全体", detail: "状況を見る" },
  { id: "expenses", label: "立替", detail: "支払いを記録" },
  { id: "settlements", label: "精算", detail: "送金を確認" },
];

const sectionClassName =
  "rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,251,255,0.88))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6";

const inputClassName =
  "w-full rounded-[24px] border border-black/10 bg-white px-4 py-4 text-[#1d1d1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_10px_24px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}円`;
}

function getParticipantShares(expense: ExpenseItem) {
  return expense.participants.map((participant) => ({
    memberId: participant.memberId,
    amount: participant.shareAmount,
  }));
}

function buildParticipantAmountRecord(participants: ExpenseParticipant[]) {
  return Object.fromEntries(
    participants.map((participant) => [participant.memberId, String(participant.shareAmount)])
  );
}

function buildShareRecord(memberIds: number[], totalAmount: number) {
  return Object.fromEntries(
    buildEqualParticipantShares(totalAmount, memberIds).map((share) => [
      share.memberId,
      String(share.amount),
    ])
  );
}

function isCustomExpense(expense: ExpenseItem) {
  return !isEqualParticipantShares(expense.amount, getParticipantShares(expense));
}

function formatParticipantSummary(expense: ExpenseItem) {
  if (!isCustomExpense(expense)) {
    return expense.participants.map((participant) => participant.name).join("・");
  }

  return expense.participants
    .map((participant) => `${participant.name} ${formatCurrency(participant.shareAmount)}`)
    .join(" ・ ");
}

export default function EventClient({
  publicId,
  eventName,
  members,
  expenses,
  balances,
  settlements,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingPayerMemberId, setEditingPayerMemberId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");
  const [editingAmount, setEditingAmount] = useState("");
  const [editingParticipantMemberIds, setEditingParticipantMemberIds] = useState<number[]>([]);
  const [editingSplitMode, setEditingSplitMode] = useState<SplitMode>("equal");
  const [editingParticipantAmounts, setEditingParticipantAmounts] = useState<Record<number, string>>(
    {}
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isTogglingSettlementKey, setIsTogglingSettlementKey] = useState<string | null>(null);
  const [isDeletingExpenseId, setIsDeletingExpenseId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const editingNumericAmount = useMemo(() => Number(editingAmount), [editingAmount]);

  const editingEqualPreviewPerPerson =
    editingParticipantMemberIds.length > 0 &&
    Number.isFinite(editingNumericAmount) &&
    editingNumericAmount > 0
      ? Math.ceil(editingNumericAmount / editingParticipantMemberIds.length)
      : null;

  const editingCustomTotal = useMemo(() => {
    return editingParticipantMemberIds.reduce((sum, memberId) => {
      const value = Number(editingParticipantAmounts[memberId] ?? "");
      return Number.isFinite(value) && value > 0 ? sum + value : sum;
    }, 0);
  }, [editingParticipantAmounts, editingParticipantMemberIds]);

  const editingRemainingAmount = useMemo(() => {
    if (!Number.isFinite(editingNumericAmount) || editingNumericAmount <= 0) {
      return null;
    }

    return editingNumericAmount - editingCustomTotal;
  }, [editingCustomTotal, editingNumericAmount]);

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

  const totalPaid = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  const averagePerMember = useMemo(() => {
    if (members.length === 0 || totalPaid <= 0) return null;
    return Math.ceil(totalPaid / members.length);
  }, [members.length, totalPaid]);

  const completionRatio = useMemo(() => {
    if (totalSettlementCount === 0) return 100;
    return Math.round((completedSettlementCount / totalSettlementCount) * 100);
  }, [completedSettlementCount, totalSettlementCount]);

  const outstandingAmount = useMemo(() => {
    return settlements.reduce((sum, settlement) => {
      if (settlement.isCompleted) return sum;
      return sum + settlement.amount;
    }, 0);
  }, [settlements]);

  const topPayer = useMemo(() => {
    if (expenses.length === 0) return null;

    const totals = new Map<number, { name: string; total: number }>();

    for (const expense of expenses) {
      const current = totals.get(expense.payerMemberId);

      totals.set(expense.payerMemberId, {
        name: expense.payerName,
        total: (current?.total ?? 0) + expense.amount,
      });
    }

    return [...totals.values()].sort((a, b) => b.total - a.total)[0] ?? null;
  }, [expenses]);

  const highlightedBalance = useMemo(() => {
    if (balances.length === 0) return null;
    return [...balances].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))[0];
  }, [balances]);

  const recentExpenses = expenses.slice(0, 4);
  const pendingSettlements = sortedSettlements.filter((settlement) => !settlement.isCompleted);
  const memberPreview = members.slice(0, 5);
  const activeTabIndex = tabItems.findIndex((item) => item.id === activeTab);

  const switchTab = (tabId: TabId) => {
    startTransition(() => {
      setActiveTab(tabId);
    });
  };

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error(error);
      alert("URLのコピーに失敗しました");
    }
  };

  const startEdit = (expense: ExpenseItem) => {
    const participantShares = getParticipantShares(expense);

    setEditingExpenseId(expense.id);
    setEditingPayerMemberId(String(expense.payerMemberId));
    setEditingTitle(expense.title);
    setEditingAmount(String(expense.amount));
    setEditingParticipantMemberIds(expense.participants.map((participant) => participant.memberId));
    setEditingParticipantAmounts(buildParticipantAmountRecord(expense.participants));
    setEditingSplitMode(
      isEqualParticipantShares(expense.amount, participantShares) ? "equal" : "custom"
    );
    switchTab("expenses");
  };

  const cancelEdit = () => {
    setEditingExpenseId(null);
    setEditingPayerMemberId("");
    setEditingTitle("");
    setEditingAmount("");
    setEditingParticipantMemberIds([]);
    setEditingParticipantAmounts({});
    setEditingSplitMode("equal");
  };

  const toggleEditingParticipant = (memberId: number) => {
    setEditingParticipantMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };

  const selectAllEditingParticipants = () => {
    const allIds = members.map((member) => member.id);
    setEditingParticipantMemberIds(allIds);

    if (
      editingSplitMode === "custom" &&
      Number.isFinite(editingNumericAmount) &&
      editingNumericAmount > 0 &&
      allIds.every((memberId) => !(editingParticipantAmounts[memberId] ?? ""))
    ) {
      setEditingParticipantAmounts((prev) => ({
        ...prev,
        ...buildShareRecord(allIds, editingNumericAmount),
      }));
    }
  };

  const clearEditingParticipants = () => {
    setEditingParticipantMemberIds([]);
  };

  const handleEditingSplitModeChange = (nextMode: SplitMode) => {
    if (
      nextMode === "custom" &&
      editingParticipantMemberIds.length > 0 &&
      Number.isFinite(editingNumericAmount) &&
      editingNumericAmount > 0 &&
      editingParticipantMemberIds.every(
        (memberId) => !(editingParticipantAmounts[memberId] ?? "")
      )
    ) {
      setEditingParticipantAmounts((prev) => ({
        ...prev,
        ...buildShareRecord(editingParticipantMemberIds, editingNumericAmount),
      }));
    }

    setEditingSplitMode(nextMode);
  };

  const handleEditingParticipantAmountChange = (memberId: number, value: string) => {
    setEditingParticipantAmounts((prev) => ({
      ...prev,
      [memberId]: value,
    }));
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

    const body: {
      payerMemberId: number;
      title: string;
      amount: number;
      participantMemberIds?: number[];
      participantShares?: { memberId: number; amount: number }[];
    } = {
      payerMemberId,
      title: editingTitle.trim(),
      amount,
    };

    if (editingSplitMode === "equal") {
      body.participantMemberIds = editingParticipantMemberIds;
    } else {
      const participantShares = editingParticipantMemberIds.map((memberId) => ({
        memberId,
        amount: Number(editingParticipantAmounts[memberId] ?? ""),
      }));

      if (
        participantShares.some(
          (share) => !Number.isInteger(share.amount) || share.amount <= 0
        )
      ) {
        alert("個別金額を全員分入力してください");
        return;
      }

      const total = participantShares.reduce((sum, share) => sum + share.amount, 0);

      if (total !== amount) {
        alert("参加者ごとの金額合計を支払い合計に合わせてください");
        return;
      }

      body.participantShares = participantShares;
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
          body: JSON.stringify(body),
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
    <div className="mt-5 space-y-5">
      <section className="relative overflow-hidden rounded-[38px] bg-[linear-gradient(180deg,#1b96e4_0%,#138ddd_50%,#10b5e1_100%)] p-5 text-white shadow-[0_28px_65px_rgba(14,116,144,0.22)] ring-1 ring-white/35 sm:p-6">
        <div className="pointer-events-none absolute -right-20 top-[-72px] h-64 w-64 rounded-full bg-white/14 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-[-88px] h-56 w-56 rounded-full bg-cyan-100/28 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_320px]">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.22em] text-white/72">
              EVENT OVERVIEW
            </p>
            <h2 className="mt-3 text-[clamp(2.4rem,8vw,4.8rem)] font-semibold tracking-[-0.1em] text-white">
              {eventName}
            </h2>

            <div className="mt-7">
              <p className="text-sm font-medium text-white/74">1人あたりの平均</p>
              <p className="mt-2 text-[clamp(3rem,11vw,5.7rem)] font-semibold tracking-[-0.1em] tabular-nums text-white">
                {averagePerMember !== null ? formatCurrency(averagePerMember) : "—"}
              </p>
            </div>

            <div className="mt-6 max-w-xl rounded-[24px] bg-white/14 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-white/74">精算完了率</p>
                <p className="text-sm font-semibold text-white/92">
                  {completedSettlementCount} / {totalSettlementCount || 0}
                </p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/18">
                <div
                  className="h-full rounded-full bg-white/90 transition-all duration-500"
                  style={{ width: `${completionRatio}%` }}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {memberPreview.map((member) => (
                <span
                  key={member.id}
                  className="rounded-full border border-white/16 bg-white/14 px-3 py-1.5 text-sm font-medium text-white/92 shadow-[0_8px_18px_rgba(15,23,42,0.05)] backdrop-blur"
                >
                  {member.name}
                </span>
              ))}

              {members.length > memberPreview.length && (
                <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-sm font-medium text-white/72">
                  +{members.length - memberPreview.length}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={copyCurrentUrl}
              className={`w-full rounded-[24px] border p-4 text-left shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)] ${
                copied
                  ? "border-sky-200/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(234,247,255,0.72))]"
                  : "border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(234,247,255,0.72))]"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      copied ? "text-sky-700" : "text-neutral-500"
                    }`}
                  >
                    共有リンク
                  </p>
                  <p
                    className={`mt-1 text-xl font-semibold tracking-[-0.05em] ${
                      copied ? "text-sky-800" : "text-[#1d1d1f]"
                    }`}
                  >
                    {copied ? "URLをコピーしました" : "このイベントURLをコピー"}
                  </p>
                </div>

                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
                    copied ? "bg-sky-100 text-sky-700" : "bg-sky-50 text-sky-700"
                  }`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M9 15H7a4 4 0 0 1 0-8h2" strokeLinecap="round" />
                    <path d="M15 9h2a4 4 0 0 1 0 8h-2" strokeLinecap="round" />
                    <path d="M8 12h8" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </button>

            <MetricCard label="支払い合計" value={formatCurrency(totalPaid)} detail={`${expenses.length}件の記録`} />
            <MetricCard
              label="未精算"
              value={outstandingAmount > 0 ? formatCurrency(outstandingAmount) : "なし"}
              detail={`完了 ${completedSettlementCount} / ${totalSettlementCount}`}
            />
            <MetricCard label="完了率" value={`${completionRatio}%`} detail="送金の進み具合" />
          </div>
        </div>
      </section>

      <div className="rounded-[28px] border border-white/75 bg-white/64 p-2 shadow-[0_16px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="relative grid grid-cols-3 rounded-[22px] bg-[rgba(236,244,250,0.92)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div
            className="absolute bottom-1 left-1 top-1 rounded-[18px] bg-white shadow-[0_14px_28px_rgba(15,23,42,0.1)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: "calc((100% - 0.5rem) / 3)",
              transform: `translateX(calc(${activeTabIndex} * 100%))`,
            }}
          />

          {tabItems.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className="relative z-10 rounded-[18px] px-3 py-3 text-center transition"
            >
              <p
                className={`text-base font-semibold ${
                  activeTab === tab.id ? "text-[#1d1d1f]" : "text-neutral-500"
                }`}
              >
                {tab.label}
              </p>
              <p
                className={`mt-1 text-[11px] ${
                  activeTab === tab.id ? "text-neutral-400" : "text-neutral-400"
                }`}
              >
                {tab.detail}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div key={activeTab} className="apple-panel-enter">
        {activeTab === "overview" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <SectionCard
              title="最近の立替"
              subtitle="追加された支払いを上から確認"
              action={
                <button
                  type="button"
                  onClick={() => switchTab("expenses")}
                  className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                >
                  立替を追加
                </button>
              }
            >
              {recentExpenses.length === 0 ? (
                <EmptyState>
                  まだ支払いは追加されていません。まずは「立替」タブから1件登録してください。
                </EmptyState>
              ) : (
                <div className="space-y-3">
                  {recentExpenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} />
                  ))}

                  {expenses.length > recentExpenses.length && (
                    <button
                      type="button"
                      onClick={() => switchTab("expenses")}
                      className="w-full rounded-[24px] border border-[#dce7f4] bg-white/90 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-white"
                    >
                      残り {expenses.length - recentExpenses.length} 件も見る
                    </button>
                  )}
                </div>
              )}
            </SectionCard>

            <div className="space-y-5">
              <SectionCard
                title="精算の進み具合"
                subtitle={`完了 ${completedSettlementCount} / ${totalSettlementCount}`}
                action={
                  <button
                    type="button"
                    onClick={() => switchTab("settlements")}
                    className="rounded-full border border-[#dce7f4] bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:-translate-y-0.5 hover:text-[#1d1d1f]"
                  >
                    精算を見る
                  </button>
                }
              >
                {pendingSettlements.length === 0 ? (
                  <div className="rounded-[26px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(240,253,250,0.92))] p-5 text-emerald-900 shadow-[0_12px_28px_rgba(16,185,129,0.08)]">
                    <p className="text-lg font-semibold">送金は不要です</p>
                    <p className="mt-2 text-sm leading-6">
                      すでに全員の負担がちょうど釣り合っています。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingSettlements.slice(0, 3).map((settlement, index) => (
                      <div
                        key={`${settlement.fromMemberId}-${settlement.toMemberId}-${settlement.amount}-${index}`}
                        className="rounded-[24px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(241,250,255,0.86))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-[#1d1d1f]">
                              {settlement.fromName}
                              <span className="mx-2 text-neutral-300">→</span>
                              {settlement.toName}
                            </p>
                            <p className="mt-1 text-sm text-neutral-500">
                              送金が必要です
                            </p>
                          </div>

                          <p className="text-lg font-semibold tabular-nums text-[#1d1d1f]">
                            {formatCurrency(settlement.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="差額サマリー" subtitle="だれが多く払い、だれが受け取るか">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    label="いちばん立て替えた人"
                    value={topPayer?.name ?? "—"}
                    detail={topPayer ? formatCurrency(topPayer.total) : "まだ支払いなし"}
                  />
                  <MetricCard
                    label="差額が大きい人"
                    value={highlightedBalance?.name ?? "—"}
                    detail={
                      highlightedBalance
                        ? formatSignedYen(highlightedBalance.balance)
                        : "まだ差額なし"
                    }
                  />
                </div>

                {balances.length === 0 ? (
                  <EmptyState className="mt-4">
                    支払いが追加されると、ここに差額が表示されます。
                  </EmptyState>
                ) : (
                  <div className="mt-4 space-y-3">
                    {balances.map((balance) => (
                      <div
                        key={balance.memberId}
                        className="flex items-center justify-between gap-4 rounded-[24px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(241,250,255,0.86))] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                      >
                        <p className="text-sm font-semibold text-neutral-700">
                          {balance.name}
                        </p>
                        <p
                          className={`text-lg font-semibold tabular-nums ${
                            balance.balance > 0
                              ? "text-emerald-600"
                              : balance.balance < 0
                              ? "text-rose-600"
                              : "text-[#1d1d1f]"
                          }`}
                        >
                          {formatSignedYen(balance.balance)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <ExpenseForm publicId={publicId} members={members} />

            <SectionCard
              title="支払い一覧"
              subtitle="追加した支払いを時系列で管理"
              action={
                <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700">
                  {expenses.length}件
                </span>
              }
            >
              {expenses.length === 0 ? (
                <EmptyState>
                  まだ支払いは追加されていません。左のフォームから最初の立替を登録してください。
                </EmptyState>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => {
                    const isEditing = editingExpenseId === expense.id;

                    return (
                      <div
                        key={expense.id}
                        className="rounded-[26px] border border-[#dce7f4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.92))] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                      >
                        {!isEditing ? (
                          <div className="space-y-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-semibold text-[#1d1d1f]">
                                    {expense.title}
                                  </p>
                                  <span className="rounded-full border border-[#dce7f4] bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
                                    {isCustomExpense(expense) ? "個別" : "均等"}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-neutral-500">
                                  支払った人: {expense.payerName}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-neutral-500">
                                  対象: {formatParticipantSummary(expense)}
                                </p>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className="text-2xl font-semibold tracking-[-0.05em] tabular-nums text-[#1d1d1f]">
                                  {formatCurrency(expense.amount)}
                                </p>
                                <div className="mt-2 flex gap-3 sm:justify-end">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(expense)}
                                    className="text-sm font-semibold text-neutral-500 transition hover:text-[#1d1d1f]"
                                  >
                                    編集
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteExpense(expense.id)}
                                    className="text-sm font-semibold text-rose-500 transition hover:text-rose-700"
                                  >
                                    {isDeletingExpenseId === expense.id ? "削除中..." : "削除"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-base font-semibold text-[#1d1d1f]">
                                支払いを編集
                              </p>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="text-sm font-semibold text-neutral-500 transition hover:text-[#1d1d1f]"
                              >
                                キャンセル
                              </button>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-neutral-700">
                                支払った人
                              </label>
                              <select
                                value={editingPayerMemberId}
                                onChange={(e) => setEditingPayerMemberId(e.target.value)}
                                className={inputClassName}
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
                              <label className="mb-2 block text-sm font-medium text-neutral-700">
                                内容
                              </label>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className={inputClassName}
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-neutral-700">
                                金額
                              </label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={editingAmount}
                                onChange={(e) => setEditingAmount(e.target.value)}
                                className={inputClassName}
                              />
                            </div>

                            <ParticipantShareEditor
                              members={members}
                              splitMode={editingSplitMode}
                              onSplitModeChange={handleEditingSplitModeChange}
                              selectedMemberIds={editingParticipantMemberIds}
                              onToggleMember={toggleEditingParticipant}
                              onSelectAll={selectAllEditingParticipants}
                              onClear={clearEditingParticipants}
                              participantAmounts={editingParticipantAmounts}
                              onAmountChange={handleEditingParticipantAmountChange}
                              equalPreviewPerPerson={editingEqualPreviewPerPerson}
                              customTotal={editingCustomTotal}
                              remainingAmount={editingRemainingAmount}
                            />

                            <button
                              type="button"
                              onClick={saveEdit}
                              disabled={isSavingEdit}
                              className="w-full rounded-[26px] bg-[linear-gradient(135deg,#1b96e4_0%,#0f80d7_60%,#10aedc_100%)] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_36px_rgba(14,116,144,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(14,116,144,0.22)] disabled:opacity-50"
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
            </SectionCard>
          </div>
        )}

        {activeTab === "settlements" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <SectionCard
              title="精算一覧"
              subtitle="今必要な送金を上から確認"
              action={
                <span className="rounded-full border border-[#dce7f4] bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700">
                  完了 {completedSettlementCount} / {totalSettlementCount}
                </span>
              }
            >
              {sortedSettlements.length === 0 ? (
                <div className="rounded-[26px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(240,253,250,0.92))] p-5 text-emerald-900 shadow-[0_12px_28px_rgba(16,185,129,0.08)]">
                  <p className="text-lg font-semibold">送金は不要です</p>
                  <p className="mt-2 text-sm leading-6">
                    すでに全員の負担がちょうど釣り合っています。
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSettlements.map((settlement, index) => {
                    const key = `${settlement.fromMemberId}-${settlement.toMemberId}-${settlement.amount}`;

                    return (
                      <div
                        key={`${key}-${index}`}
                        className={`rounded-[26px] border p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] ${
                          settlement.isCompleted
                            ? "border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(255,255,255,0.94))]"
                            : "border-[#dce7f4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.92))]"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-[#1d1d1f]">
                              {settlement.fromName}
                              <span className="mx-2 text-neutral-300">→</span>
                              {settlement.toName}
                            </p>
                            <p className="mt-2 text-sm text-neutral-500">支払う金額</p>
                            <p className="text-3xl font-semibold tracking-[-0.07em] tabular-nums text-[#1d1d1f]">
                              {formatCurrency(settlement.amount)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleSettlementComplete(settlement)}
                            disabled={isTogglingSettlementKey === key}
                            className={`rounded-[22px] px-4 py-3 text-sm font-bold transition ${
                              settlement.isCompleted
                                ? "bg-emerald-600 text-white shadow-[0_10px_20px_rgba(5,150,105,0.18)] hover:bg-emerald-700"
                                : "bg-[linear-gradient(135deg,#101828_0%,#155eef_100%)] text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.22)]"
                            } disabled:opacity-50`}
                          >
                            {isTogglingSettlementKey === key
                              ? "更新中..."
                              : settlement.isCompleted
                              ? "支払い完了"
                              : "完了にする"}
                          </button>
                        </div>

                        {settlement.isCompleted && (
                          <p className="mt-3 text-sm font-semibold text-emerald-700">
                            この送金は完了済みです。
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="差額一覧" subtitle="実際に払った額と本来負担すべき額の差">
              {balances.length === 0 ? (
                <EmptyState>まだ精算データがありません。</EmptyState>
              ) : (
                <div className="space-y-3">
                  {balances.map((balance) => (
                    <div
                      key={balance.memberId}
                      className="rounded-[24px] border border-[#dce7f4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.92))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-base font-semibold text-[#1d1d1f]">
                          {balance.name}
                        </p>

                        <div className="text-right">
                          <p className="text-sm text-neutral-500">差額</p>
                          <p
                            className={`text-2xl font-semibold tracking-[-0.05em] tabular-nums ${
                              balance.balance > 0
                                ? "text-emerald-600"
                                : balance.balance < 0
                                ? "text-rose-600"
                                : "text-[#1d1d1f]"
                            }`}
                          >
                            {formatSignedYen(balance.balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        )}
      </div>

      {isPending && <div className="sr-only">切り替え中</div>}
    </div>
  );
}

type SectionCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <section className={sectionClassName}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[28px] font-semibold tracking-[-0.06em] text-[#1d1d1f]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-2 text-sm leading-6 text-neutral-500">{subtitle}</p>
          )}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
};

function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <div className="rounded-[24px] border border-white/78 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(234,247,255,0.72))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-[28px] font-semibold tracking-[-0.06em] text-[#1d1d1f]">
        {value}
      </p>
      <p className="mt-2 text-sm text-neutral-500">{detail}</p>
    </div>
  );
}

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
};

function EmptyState({ children, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`rounded-[26px] border border-dashed border-[#c9d8ea] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(237,248,255,0.8))] p-5 text-sm leading-6 text-neutral-500 ${className}`}
    >
      {children}
    </div>
  );
}

function ExpenseCard({ expense }: { expense: ExpenseItem }) {
  return (
    <div className="flex flex-col gap-4 rounded-[26px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(241,250,255,0.84))] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-lg font-semibold text-sky-700">
          {expense.payerName.slice(0, 1)}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-[#1d1d1f]">{expense.title}</p>
            <span className="rounded-full border border-[#dce7f4] bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-500">
              {isCustomExpense(expense) ? "個別" : "均等"}
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">{expense.payerName}</p>
          <p className="mt-1 text-sm leading-6 text-neutral-500">
            {formatParticipantSummary(expense)}
          </p>
        </div>
      </div>

      <p className="text-left text-2xl font-semibold tracking-[-0.05em] tabular-nums text-[#1d1d1f] sm:text-right">
        {formatCurrency(expense.amount)}
      </p>
    </div>
  );
}
