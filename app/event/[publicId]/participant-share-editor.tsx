"use client";

type Member = {
  id: number;
  name: string;
};

export type SplitMode = "equal" | "custom";

type Props = {
  members: Member[];
  splitMode: SplitMode;
  onSplitModeChange: (mode: SplitMode) => void;
  selectedMemberIds: number[];
  onToggleMember: (memberId: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  participantAmounts: Record<number, string>;
  onAmountChange: (memberId: number, value: string) => void;
  equalPreviewPerPerson: number | null;
  customTotal: number;
  remainingAmount: number | null;
};

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()}円`;
}

export default function ParticipantShareEditor({
  members,
  splitMode,
  onSplitModeChange,
  selectedMemberIds,
  onToggleMember,
  onSelectAll,
  onClear,
  participantAmounts,
  onAmountChange,
  equalPreviewPerPerson,
  customTotal,
  remainingAmount,
}: Props) {
  const selectedCount = selectedMemberIds.length;
  const isMatched = remainingAmount === 0;
  const isOver = (remainingAmount ?? 0) < 0;

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label className="text-sm font-medium text-neutral-700">誰の分か</label>
          <p className="mt-1 text-xs text-neutral-500">
            {splitMode === "equal"
              ? "選んだメンバーで均等に割ります"
              : "参加者ごとに負担額を直接入れます"}
          </p>
        </div>

        <div className="inline-flex rounded-full border border-[#d7dfe9] bg-[#eef2f6] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
          <button
            type="button"
            onClick={() => onSplitModeChange("equal")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              splitMode === "equal"
                ? "bg-white text-[#1d1d1f] shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
                : "text-neutral-500"
            }`}
          >
            均等
          </button>
          <button
            type="button"
            onClick={() => onSplitModeChange("custom")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              splitMode === "custom"
                ? "bg-white text-[#1d1d1f] shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
                : "text-neutral-500"
            }`}
          >
            個別
          </button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="rounded-full border border-[#dce7f4] bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-white active:scale-[0.98]"
        >
          全員選択
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-full border border-[#dce7f4] bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-white active:scale-[0.98]"
        >
          解除
        </button>
      </div>

      {splitMode === "equal" ? (
        <div className="flex flex-wrap gap-2.5">
          {members.map((member) => {
            const selected = selectedMemberIds.includes(member.id);

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggleMember(member.id)}
                className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-sky-600 bg-[linear-gradient(135deg,#1b96e4_0%,#0f80d7_100%)] text-white shadow-[0_8px_20px_rgba(14,116,144,0.18)]"
                    : "border-[#dce7f4] bg-white text-neutral-700 shadow-sm hover:bg-slate-50"
                } active:scale-[0.98]`}
              >
                {member.name}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {members.map((member) => {
            const selected = selectedMemberIds.includes(member.id);

            return (
              <div
                key={member.id}
                className={`grid items-center gap-3 rounded-[22px] border p-3 transition sm:grid-cols-[minmax(0,1fr)_132px] ${
                  selected
                    ? "border-[#c7ddf8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,250,255,0.92))] shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                    : "border-[#dce7f4] bg-white/78"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleMember(member.id)}
                  className="flex items-center gap-3 text-left"
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold transition ${
                      selected
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "border-[#c9d8ea] bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-sm font-semibold text-[#1d1d1f]">
                    {member.name}
                  </span>
                </button>

                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={participantAmounts[member.id] ?? ""}
                  onChange={(e) => onAmountChange(member.id, e.target.value)}
                  disabled={!selected}
                  placeholder="0"
                  className="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-right text-base font-semibold text-[#1d1d1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_6px_14px_rgba(15,23,42,0.03)] outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-45"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[24px] border border-[#dce7f4] bg-white/92 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-neutral-500">対象人数</p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.05em] text-[#1d1d1f]">
            {selectedCount}人
          </p>
        </div>

        <div className="rounded-[24px] border border-[#dce7f4] bg-white/92 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-neutral-500">
            {splitMode === "equal" ? "1人あたりの目安" : "入力合計"}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-[-0.05em] text-[#1d1d1f]">
            {splitMode === "equal"
              ? equalPreviewPerPerson !== null
                ? formatCurrency(equalPreviewPerPerson)
                : "—"
              : formatCurrency(customTotal)}
          </p>
        </div>

        <div className="rounded-[24px] border border-[#dce7f4] bg-white/92 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-neutral-500">
            {splitMode === "equal" ? "分け方" : "残り"}
          </p>
          <p
            className={`mt-1 text-xl font-semibold tracking-[-0.05em] ${
              splitMode === "equal"
                ? "text-[#1d1d1f]"
                : isMatched
                ? "text-emerald-600"
                : isOver
                ? "text-rose-600"
                : "text-amber-600"
            }`}
          >
            {splitMode === "equal"
              ? "均等"
              : isMatched
              ? "一致"
              : remainingAmount !== null
              ? formatCurrency(Math.abs(remainingAmount))
              : "—"}
          </p>
          {splitMode === "custom" && remainingAmount !== null && !isMatched && (
            <p className="mt-1 text-xs text-neutral-500">
              {isOver ? "入力が多すぎます" : "まだ配分が足りません"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
