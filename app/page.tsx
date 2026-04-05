"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedMembers = useMemo(() => {
    return members
      .map((member) => member.trim())
      .filter((member) => member.length > 0);
  }, [members]);

  const addMember = () => {
    const name = memberInput.trim();

    if (!name) return;
    if (trimmedMembers.includes(name)) return;

    setMembers((prev) => [...prev, name]);
    setMemberInput("");
  };

  const removeMember = (target: string) => {
    setMembers((prev) => prev.filter((member) => member !== target));
  };

  const handleMemberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMember();
    }
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim() || trimmedMembers.length === 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventName: eventName.trim(),
          members: trimmedMembers,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        alert(error?.message ?? "イベント作成に失敗しました");
        return;
      }

      const data = await res.json();
      router.push(`/event/${data.publicId}`);
    } catch (error) {
      console.error(error);
      alert("イベント作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fffe,_#eef6ff_45%,_#f6f7fb_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-200/50 blur-3xl" />
          <div className="absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-indigo-200/40 blur-3xl" />

          <div className="relative">
            <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-cyan-700">
              WaliWali
            </p>

            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              立替精算イベントを作成
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              飲み会や旅行などのイベントごとに、参加メンバーをまとめて管理し、
              あとで立替精算できるイベントをすぐ作成できます。
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <section className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-900">イベント設定</h2>
              <p className="text-sm text-slate-500">
                イベント名と参加メンバーを入力
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="eventName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  イベント名
                </label>
                <input
                  id="eventName"
                  type="text"
                  placeholder="例: 宇宙旅行"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] placeholder:text-slate-400 outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">メンバー</p>
                  <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-sm font-bold text-cyan-700">
                    {trimmedMembers.length}人
                  </span>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    placeholder="名前を入力"
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={handleMemberKeyDown}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,23,42,0.04)] placeholder:text-slate-400 outline-none transition duration-200 focus:-translate-y-[1px] focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  />

                  <button
                    type="button"
                    onClick={addMember}
                    className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-700 px-5 py-4 text-sm font-bold text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.24)] active:translate-y-[1px] active:scale-[0.99]"
                  >
                    追加
                  </button>
                </div>

                <div className="mt-4">
                  {trimmedMembers.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 text-sm text-slate-500">
                      まだメンバーが追加されていません。
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {trimmedMembers.map((member) => (
                        <div
                          key={member}
                          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 shadow-sm"
                        >
                          <span className="text-sm font-semibold text-slate-700">
                            {member}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeMember(member)}
                            className="text-sm font-bold text-slate-400 transition hover:text-rose-500 active:scale-90"
                            aria-label={`${member}を削除`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-900">プレビュー</h2>
              <p className="text-sm text-slate-500">
                今入力しているイベント内容
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <p className="text-sm text-slate-500">イベント名</p>
                <p className="mt-1 text-xl font-black text-slate-900">
                  {eventName.trim() || "未入力"}
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <p className="text-sm text-slate-500">メンバー数</p>
                <p className="mt-1 text-xl font-black text-slate-900">
                  {trimmedMembers.length}人
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <p className="text-sm text-slate-500">参加メンバー</p>

                {trimmedMembers.length === 0 ? (
                  <p className="mt-2 text-base font-semibold text-slate-400">
                    未追加
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {trimmedMembers.map((member) => (
                      <span
                        key={member}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                      >
                        {member}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateEvent}
              className="mt-6 w-full rounded-[24px] bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-500 px-4 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(14,116,144,0.28)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(14,116,144,0.34)] active:translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
              disabled={!eventName.trim() || trimmedMembers.length === 0 || isSubmitting}
            >
              {isSubmitting ? "作成中..." : "イベントを作成"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}