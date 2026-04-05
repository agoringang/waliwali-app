import { prisma } from "../../../src/lib/prisma";
import ExpenseForm from "./expense-form";
import EventClient from "./event-client";
import {
  calculateBalances,
  calculateSettlements,
} from "../../../src/lib/settlement";

type Props = {
  params: Promise<{
    publicId: string;
  }>;
};

export default async function EventPage({ params }: Props) {
  const { publicId } = await params;

  if (!publicId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-bold text-slate-500">
          publicId が取得できませんでした
        </p>
      </main>
    );
  }

  const event = await prisma.event.findUnique({
    where: {
      publicId,
    },
    include: {
      members: true,
      expenses: {
        include: {
          payer: true,
          participants: {
            include: {
              member: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      settlements: true,
    },
  });

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-bold text-slate-500">
          イベントが見つかりません
        </p>
      </main>
    );
  }

  const balances = calculateBalances(
    event.members.map((member: { id: number; name: string }) => ({
      id: member.id,
      name: member.name,
    })),
    event.expenses.map((expense: {
      payerMemberId: number;
      amount: number;
      participants: { memberId: number }[];
    }) => ({
      payerMemberId: expense.payerMemberId,
      amount: expense.amount,
      participants: expense.participants.map((item: { memberId: number }) => ({
        memberId: item.memberId,
      })),
    }))
  );

  const rawSettlements = calculateSettlements(balances);

  const settlements = rawSettlements.map((row) => {
    const matched = event.settlements.find(
      (item: {
      fromMemberId: number;
      toMemberId: number;
      amount: number;
      isCompleted: boolean;
    }) =>
        item.fromMemberId === row.fromMemberId &&
        item.toMemberId === row.toMemberId &&
        item.amount === row.amount
    );

    return {
      ...row,
      isCompleted: matched?.isCompleted ?? false,
    };
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fffe,_#eef6ff_45%,_#f6f7fb_100%)] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black">{event.name}</h1>
              <p className="mt-2 text-sm text-slate-500">
                イベントID: {event.publicId}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              共有して同じイベントを一緒に更新できます
            </div>
          </div>
        </header>

        <section className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
          <h2 className="mb-4 text-lg font-black">メンバー</h2>

          {event.members.length === 0 ? (
            <p className="text-slate-500">メンバーがいません</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {event.members.map((member: { id: number; name: string }) => (
                <span
                  key={member.id}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                >
                  {member.name}
                </span>
              ))}
            </div>
          )}
        </section>

        <ExpenseForm
          publicId={event.publicId}
          members={event.members.map((member: { id: number; name: string }) => ({
            id: member.id,
            name: member.name,
          }))}
        />

        <EventClient
          publicId={event.publicId}
          eventName={event.name}
          members={event.members.map((member: { id: number; name: string }) => ({
            id: member.id,
            name: member.name,
          }))}
          expenses={event.expenses.map((expense) => ({
            id: expense.id,
            payerMemberId: expense.payerMemberId,
            payerName: expense.payer.name,
            title: expense.title,
            amount: expense.amount,
            participants: expense.participants.map((item) => ({
              memberId: item.memberId,
              name: item.member.name,
            })),
          }))}
          balances={balances}
          settlements={settlements}
        />
      </div>
    </main>
  );
}