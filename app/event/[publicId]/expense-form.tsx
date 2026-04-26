"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildEqualParticipantShares } from "../../../src/lib/expense-shares";
import ParticipantShareEditor, {
  type SplitMode,
} from "./participant-share-editor";

type Member = {
  id: number;
  name: string;
};

type Props = {
  publicId: string;
  members: Member[];
};

function buildShareRecord(memberIds: number[], totalAmount: number) {
  const shares = buildEqualParticipantShares(totalAmount, memberIds);
  return Object.fromEntries(shares.map((share) => [share.memberId, String(share.amount)]));
}

export default function ExpenseForm({ publicId, members }: Props) {
  const router = useRouter();

  const [payerMemberId, setPayerMemberId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [participantMemberIds, setParticipantMemberIds] = useState<number[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [participantAmounts, setParticipantAmounts] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericAmount = useMemo(() => Number(amount), [amount]);

  const equalPreviewPerPerson =
    participantMemberIds.length > 0 &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0
      ? Math.ceil(numericAmount / participantMemberIds.length)
      : null;

  const customTotal = useMemo(() => {
    return participantMemberIds.reduce((sum, memberId) => {
      const value = Number(participantAmounts[memberId] ?? "");
      return Number.isFinite(value) && value > 0 ? sum + value : sum;
    }, 0);
  }, [participantAmounts, participantMemberIds]);

  const remainingAmount = useMemo(() => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;
    return numericAmount - customTotal;
  }, [customTotal, numericAmount]);

  const inputClassName =
    "w-full rounded-[24px] border border-black/10 bg-white px-4 py-4 text-[#1d1d1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_10px_24px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";

  const toggleParticipant = (memberId: number) => {
    setParticipantMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };

  const selectAllParticipants = () => {
    const allIds = members.map((member) => member.id);
    setParticipantMemberIds(allIds);

    if (
      splitMode === "custom" &&
      Number.isFinite(numericAmount) &&
      numericAmount > 0 &&
      allIds.every((memberId) => !(participantAmounts[memberId] ?? ""))
    ) {
      setParticipantAmounts((prev) => ({
        ...prev,
        ...buildShareRecord(allIds, numericAmount),
      }));
    }
  };

  const clearParticipants = () => {
    setParticipantMemberIds([]);
  };

  const handleSplitModeChange = (nextMode: SplitMode) => {
    if (
      nextMode === "custom" &&
      participantMemberIds.length > 0 &&
      Number.isFinite(numericAmount) &&
      numericAmount > 0 &&
      participantMemberIds.every((memberId) => !(participantAmounts[memberId] ?? ""))
    ) {
      setParticipantAmounts((prev) => ({
        ...prev,
        ...buildShareRecord(participantMemberIds, numericAmount),
      }));
    }

    setSplitMode(nextMode);
  };

  const handleParticipantAmountChange = (memberId: number, value: string) => {
    setParticipantAmounts((prev) => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const payerId = Number(payerMemberId);
    const parsedAmount = Number(amount);

    if (!Number.isInteger(payerId) || !title.trim()) {
      alert("支払った人と内容を入力してください");
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert("金額を正しく入力してください");
      return;
    }

    if (participantMemberIds.length === 0) {
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
      payerMemberId: payerId,
      title: title.trim(),
      amount: parsedAmount,
    };

    if (splitMode === "equal") {
      body.participantMemberIds = participantMemberIds;
    } else {
      const participantShares = participantMemberIds.map((memberId) => ({
        memberId,
        amount: Number(participantAmounts[memberId] ?? ""),
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

      if (total !== parsedAmount) {
        alert("参加者ごとの金額合計を支払い合計に合わせてください");
        return;
      }

      body.participantShares = participantShares;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/events/${publicId}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.message ?? "支払い追加に失敗しました");
        return;
      }

      setPayerMemberId("");
      setTitle("");
      setAmount("");
      setParticipantMemberIds([]);
      setParticipantAmounts({});
      setSplitMode("equal");

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("支払い追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[30px] border border-[#dce7f4] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,252,0.92))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-[-0.06em] text-[#1d1d1f]">
            立替を追加
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            均等でも、参加者ごとの個別金額でも、その場の支払いに合わせて記録できます。
          </p>
        </div>

        <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700">
          {members.length}人
        </span>
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              支払った人
            </label>
            <select
              value={payerMemberId}
              onChange={(e) => setPayerMemberId(e.target.value)}
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
              金額
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              placeholder="合計金額"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            内容
          </label>
          <input
            type="text"
            placeholder="内容を入力"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClassName}
          />
        </div>

        <ParticipantShareEditor
          members={members}
          splitMode={splitMode}
          onSplitModeChange={handleSplitModeChange}
          selectedMemberIds={participantMemberIds}
          onToggleMember={toggleParticipant}
          onSelectAll={selectAllParticipants}
          onClear={clearParticipants}
          participantAmounts={participantAmounts}
          onAmountChange={handleParticipantAmountChange}
          equalPreviewPerPerson={equalPreviewPerPerson}
          customTotal={customTotal}
          remainingAmount={remainingAmount}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full rounded-[28px] bg-[linear-gradient(135deg,#1b96e4_0%,#0f80d7_60%,#10aedc_100%)] px-4 py-4 text-base font-black text-white shadow-[0_20px_44px_rgba(14,116,144,0.24)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(14,116,144,0.3)] active:translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
        >
          {isSubmitting ? "追加中..." : "この支払いを追加"}
        </button>
      </div>
    </section>
  );
}
