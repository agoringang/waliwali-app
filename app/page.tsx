"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ShareEventData = {
  eventName: string;
  members: string[];
};

export default function Home() {
  const router = useRouter();
  const [eventName, setEventName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);

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

  const handleCreateEvent = () => {
    const payload: ShareEventData = {
      eventName: eventName.trim(),
      members: trimmedMembers,
    };

    const encoded = encodeURIComponent(JSON.stringify(payload));
    router.push(`/event?data=${encoded}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold tracking-wide text-slate-500">
            WaliWali
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            立替精算イベントを作成
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            飲み会や旅行などのイベントごとに、参加メンバーをまとめて管理し、
            あとで立替精算できるイベントを作成する。
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">メンバー</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
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
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                <button
                  type="button"
                  onClick={addMember}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  追加
                </button>
              </div>

              <div className="mt-4">
                {trimmedMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    まだメンバーが追加されていません。
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {trimmedMembers.map((member) => (
                      <div
                        key={member}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <span className="text-sm font-medium text-slate-700">
                          {member}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMember(member)}
                          className="text-sm font-semibold text-slate-400 transition hover:text-slate-700"
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

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold">プレビュー</h2>
            <p className="text-sm text-slate-500">
              今入力しているイベントの内容
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">イベント名</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {eventName.trim() || "未入力"}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">メンバー数</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {trimmedMembers.length}人
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">参加メンバー</p>
              {trimmedMembers.length === 0 ? (
                <p className="mt-1 text-lg font-semibold text-slate-400">
                  未追加
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {trimmedMembers.map((member) => (
                    <span
                      key={member}
                      className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200"
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
            className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!eventName.trim() || trimmedMembers.length === 0}
          >
            イベントを作成
          </button>
        </section>
      </div>
    </main>
  );
}