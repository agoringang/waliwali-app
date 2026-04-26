"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OtherAppsLink from "./ui/other-apps-link";

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

  const canCreateEvent =
    eventName.trim().length > 0 && trimmedMembers.length > 0 && !isSubmitting;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#f3f7fb_0%,#ffffff_46%,#edf4fb_100%)] px-4 py-5 text-[#1d1d1f] sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-sky-200/55 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-20 h-96 w-96 rounded-full bg-cyan-100/65 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex justify-end">
          <OtherAppsLink />
        </div>

        <section className="mt-4 grid gap-5 rounded-[36px] border border-white/70 bg-white/74 p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.28)] backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr] lg:p-7">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-[13px] font-semibold tracking-[0.24em] text-sky-700">
                WALIWALI
              </p>

              <h1 className="mt-3 text-[clamp(2.2rem,8vw,4.7rem)] font-semibold tracking-[-0.09em] text-[#1d1d1f]">
                割り勘を、
                <br />
                その場で終わらせる。
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-600 sm:text-base">
                飲み会や旅行の立替をイベント単位で整理して、誰が誰にいくら払うかまで
                一気にまとめます。
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-[24px] border border-sky-100 bg-sky-50/90 px-4 py-3 text-sm font-semibold text-sky-800 sm:hidden">
              <span>{eventName.trim() || "新しいイベント"}</span>
              <span>
                {trimmedMembers.length > 0
                  ? `${trimmedMembers.length}人で開始`
                  : "メンバー追加待ち"}
              </span>
            </div>

            <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#dce7f4] bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold tracking-[0.14em] text-neutral-500">
                  参加人数
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[#1d1d1f]">
                  {trimmedMembers.length || "—"}
                </p>
              </div>

              <div className="rounded-[24px] border border-[#dce7f4] bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold tracking-[0.14em] text-neutral-500">
                  記録単位
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                  イベントごと
                </p>
              </div>

              <div className="rounded-[24px] border border-[#dce7f4] bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold tracking-[0.14em] text-neutral-500">
                  精算
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                  自動計算
                </p>
              </div>
            </div>

            <div className="mt-6 hidden overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#1b96e4_0%,#0f80d7_64%,#10aedc_100%)] p-5 text-white shadow-[0_24px_60px_rgba(14,116,144,0.22)] md:block">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm tracking-[0.2em] text-white/74">
                    NEW EVENT
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.08em] sm:text-4xl">
                    {eventName.trim() || "新しいイベント"}
                  </p>
                  <p className="mt-2 text-sm text-white/78">
                    入力が揃うと、ここにイベントの概要が出ます
                  </p>
                </div>

                <span className="rounded-full bg-white/14 px-4 py-2 text-sm font-semibold text-white/90">
                  {trimmedMembers.length > 0 ? `${trimmedMembers.length}人` : "未設定"}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {trimmedMembers.length > 0 ? (
                  trimmedMembers.slice(0, 4).map((member) => (
                    <span
                      key={member}
                      className="rounded-full bg-white/14 px-3 py-1.5 text-sm text-white/88"
                    >
                      {member}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-white/12 px-3 py-1.5 text-sm text-white/76">
                    メンバーを追加すると表示
                  </span>
                )}
              </div>

              <div className="mt-6 h-2 rounded-full bg-white/18">
                <div className="h-full w-3/4 rounded-full bg-white/85" />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] bg-white/14 p-4 backdrop-blur">
                  <p className="text-sm text-white/72">参加メンバー</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.06em]">
                    {trimmedMembers.length > 0 ? `${trimmedMembers.length} people` : "—"}
                  </p>
                </div>

                <div className="rounded-[24px] bg-white/14 p-4 backdrop-blur">
                  <p className="text-sm text-white/72">今からできること</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.06em]">
                    すぐ共有
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="rounded-[32px] border border-[#dce7f4] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,252,0.92))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[28px] font-semibold tracking-[-0.06em] text-[#1d1d1f]">
                  イベントを作成
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  名前とメンバーを入れるだけで、すぐに割り勘ページを作れます。
                </p>
              </div>

              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700">
                {trimmedMembers.length}人
              </span>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="eventName"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  イベント名
                </label>
                <input
                  id="eventName"
                  type="text"
                  placeholder="イベント名を入力"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full rounded-[24px] border border-black/10 bg-white px-4 py-4 text-base text-[#1d1d1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_10px_24px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:-translate-y-[1px] focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-700">メンバー</p>
                  <p className="text-xs font-medium text-neutral-500">
                    Enter でも追加できます
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    placeholder="名前を入力"
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={handleMemberKeyDown}
                    className="flex-1 rounded-[24px] border border-black/10 bg-white px-4 py-4 text-base text-[#1d1d1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_10px_24px_rgba(15,23,42,0.04)] outline-none transition duration-200 focus:-translate-y-[1px] focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />

                  <button
                    type="button"
                    onClick={addMember}
                    className="rounded-[24px] bg-[linear-gradient(135deg,#101828_0%,#155eef_100%)] px-5 py-4 text-sm font-bold text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(15,23,42,0.22)] active:translate-y-[1px]"
                  >
                    追加
                  </button>
                </div>

                <div className="mt-4 rounded-[28px] border border-[#dce7f4] bg-white/86 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  {trimmedMembers.length === 0 ? (
                    <p className="text-sm leading-6 text-neutral-500">
                      まだメンバーが追加されていません。
                    </p>
                  ) : (
                    <div className="max-h-32 overflow-y-auto pr-1">
                      <div className="flex flex-wrap gap-2.5">
                        {trimmedMembers.map((member) => (
                          <div
                            key={member}
                            className="flex items-center gap-2 rounded-full border border-[#dce7f4] bg-white px-3.5 py-2 shadow-sm"
                          >
                            <span className="text-sm font-semibold text-neutral-700">
                              {member}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeMember(member)}
                              className="text-sm font-bold text-neutral-400 transition hover:text-rose-500 active:scale-90"
                              aria-label={`${member}を削除`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-[#dce7f4] bg-white/90 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  <p className="text-sm text-neutral-500">イベント名</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                    {eventName.trim() || "未入力"}
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#dce7f4] bg-white/90 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                  <p className="text-sm text-neutral-500">共有の準備</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                    {trimmedMembers.length > 0 ? "OK" : "メンバー待ち"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateEvent}
                className="w-full rounded-[28px] bg-[linear-gradient(135deg,#1b96e4_0%,#0f80d7_60%,#10aedc_100%)] px-4 py-4 text-base font-black text-white shadow-[0_20px_44px_rgba(14,116,144,0.24)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(14,116,144,0.3)] active:translate-y-[1px] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100"
                disabled={!canCreateEvent}
              >
                {isSubmitting ? "作成中..." : "イベントを作成"}
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
