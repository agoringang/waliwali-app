"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: number;
  name: string;
};

type Props = {
  publicId: string;
  members: Member[];
};

export default function ExpenseForm({ publicId, members }: Props) {
  const router = useRouter();

  const [payerMemberId, setPayerMemberId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [participantMemberIds, setParticipantMemberIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericAmount = useMemo(() => Number(amount), [amount]);

  const previewPerPerson =
    participantMemberIds.length > 0 &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0
      ? Math.ceil(numericAmount / participantMemberIds.length)
      : null;

  const toggleParticipant = (memberId: number) => {
    setParticipantMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAllParticipants = () => {
    setParticipantMemberIds(members.map((member) => member.id));
  };

  const clearParticipants = () => {
    setParticipantMemberIds([]);
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

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/events/${publicId}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payerMemberId: payerId,
          title: title.trim(),
          amount: parsedAmount,
          participantMemberIds,
        }),
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

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("支払い追加に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="mb-5">
        <h2 className="text-lg font-black text-slate-900">支払いを追加</h2>
        <p className="text-sm text-slate-500">
          誰が払って、誰の分だったのかを記録
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            支払った人
          </label>
          <select
            value={payerMemberId}
            onChange={(e) => setPayerMemberId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
              >
                全員選択
              </button>
              <button
                type="button"
                onClick={clearParticipants}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
              >
                解除
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {members.map((member) => {
              const selected = participantMemberIds.includes(member.id);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleParticipant(member.id)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-cyan-600 bg-gradient-to-r from-cyan-500 to-sky-500 text-white shadow-[0_8px_20px_rgba(14,116,144,0.25)]"
                      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                  } active:scale-[0.98]`}
                >
                  {member.name}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <p className="text-sm text-slate-500">対象人数</p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {participantMemberIds.length}人
            </p>

            <p className="mt-3 text-sm text-slate-500">1人あたりの目安</p>
            <p className="mt-1 text-xl font-black text-slate-900">
              {previewPerPerson !== null
                ? `${previewPerPerson.toLocaleString()}円`
                : "—"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full rounded-[24px] bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 px-4 py-4 text-base font-black text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.24)] active:translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
        >
          {isSubmitting ? "追加中..." : "支払いを追加"}
        </button>
      </div>
    </section>
  );
}