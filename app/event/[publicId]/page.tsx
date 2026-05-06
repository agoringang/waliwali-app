import Link from "next/link";
import { prisma } from "../../../src/lib/prisma";
import EventClient from "./event-client";
import {
  calculateBalances,
  calculateSettlements,
} from "../../../src/lib/settlement";
import OtherAppsLink from "../../ui/other-apps-link";

type Props = {
  params: Promise<{
    publicId: string;
  }>;
};

type MemberView = {
  id: number;
  name: string;
};

type ExpenseParticipantView = {
  memberId: number;
  shareAmount: number;
  member: {
    name: string;
  };
};

type ExpenseView = {
  id: number;
  payerMemberId: number;
  payer: {
    name: string;
  };
  title: string;
  amount: number;
  participants: ExpenseParticipantView[];
};

type SettlementRow = {
  fromMemberId: number;
  fromName: string;
  toMemberId: number;
  toName: string;
  amount: number;
};

type SettlementCompletionRow = {
  fromMemberId: number;
  toMemberId: number;
  amount: number;
  isCompleted: boolean;
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
    event.members.map((member: MemberView) => ({
      id: member.id,
      name: member.name,
    })),
    event.expenses.map((expense: ExpenseView) => ({
      payerMemberId: expense.payerMemberId,
      amount: expense.amount,
      participants: expense.participants.map(
        (item: { memberId: number; shareAmount: number }) => ({
          memberId: item.memberId,
          shareAmount: item.shareAmount,
        })
      ),
    }))
  );

  const rawSettlements = calculateSettlements(balances);

  const settlements = rawSettlements.map((row: SettlementRow) => {
    const matched = event.settlements.find(
      (item: SettlementCompletionRow) =>
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
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#dff3ff_0%,#edf7ff_20%,#f9fbff_54%,#dff5ff_100%)] px-4 py-5 text-[#1d1d1f] sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-sky-200/55 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-16 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-100/70 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="flex justify-end">
          <OtherAppsLink />
        </div>

        <header className="mt-4 rounded-[30px] border border-white/80 bg-white/68 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.2)] backdrop-blur-xl xl:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold tracking-[0.22em] text-sky-700">
                WALIWALI
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.07em] text-[#1d1d1f]">
                {event.name}
              </h1>
              <p className="mt-2 text-sm text-neutral-500">
                イベントID: {event.publicId}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700">
                {event.members.length}人
              </span>

              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-[#dce7f4] bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:text-[#1d1d1f]"
              >
                新しいイベントを作る
              </Link>
            </div>
          </div>
        </header>

        <EventClient
          publicId={event.publicId}
          eventName={event.name}
          members={event.members.map((member: MemberView) => ({
            id: member.id,
            name: member.name,
          }))}
          expenses={event.expenses.map((expense: ExpenseView) => ({
            id: expense.id,
            payerMemberId: expense.payerMemberId,
            payerName: expense.payer.name,
            title: expense.title,
            amount: expense.amount,
            participants: expense.participants.map(
              (item: ExpenseParticipantView) => ({
                memberId: item.memberId,
                name: item.member.name,
                shareAmount: item.shareAmount,
              })
            ),
          }))}
          balances={balances}
          settlements={settlements}
        />

        <div className="mt-6 flex justify-center">
          <OtherAppsLink />
        </div>
      </div>
    </main>
  );
}
