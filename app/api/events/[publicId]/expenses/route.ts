import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import {
  buildEqualParticipantShares,
  sumParticipantShares,
  type ParticipantShare,
} from "../../../../../src/lib/expense-shares";

type CreateExpenseBody = {
  payerMemberId?: number;
  title?: string;
  amount?: number;
  participantMemberIds?: number[];
  participantShares?: ParticipantShare[];
};

type Props = {
  params: Promise<{
    publicId: string;
  }>;
};

function resolveParticipantShares(
  amount: number,
  rawParticipantMemberIds?: number[],
  rawParticipantShares?: ParticipantShare[]
) {
  if (Array.isArray(rawParticipantShares) && rawParticipantShares.length > 0) {
    if (
      rawParticipantShares.some(
        (share) =>
          typeof share?.memberId !== "number" ||
          !Number.isInteger(share.memberId) ||
          typeof share?.amount !== "number" ||
          !Number.isInteger(share.amount) ||
          share.amount <= 0
      )
    ) {
      return {
        error: "個別金額の入力内容が不正です",
        participantShares: [] as ParticipantShare[],
      };
    }

    return {
      participantShares: rawParticipantShares,
    };
  }

  if (
    Array.isArray(rawParticipantMemberIds) &&
    rawParticipantMemberIds.length > 0 &&
    rawParticipantMemberIds.every(
      (id) => typeof id === "number" && Number.isInteger(id)
    )
  ) {
    return {
      participantShares: buildEqualParticipantShares(amount, rawParticipantMemberIds),
    };
  }

  return {
    error: "対象メンバーを1人以上選んでください",
    participantShares: [] as ParticipantShare[],
  };
}

export async function POST(req: Request, { params }: Props) {
  try {
    const { publicId } = await params;
    const body = (await req.json()) as CreateExpenseBody;

    const rawPayerMemberId = body.payerMemberId;
    const rawTitle = body.title;
    const rawAmount = body.amount;

    if (
      !publicId ||
      typeof rawPayerMemberId !== "number" ||
      !Number.isInteger(rawPayerMemberId) ||
      typeof rawTitle !== "string" ||
      !rawTitle.trim() ||
      typeof rawAmount !== "number" ||
      !Number.isFinite(rawAmount) ||
      rawAmount <= 0
    ) {
      return NextResponse.json(
        { message: "支払い情報が不足しています" },
        { status: 400 }
      );
    }

    const payerMemberId = rawPayerMemberId;
    const title = rawTitle.trim();
    const amount = rawAmount;
    const { error, participantShares } = resolveParticipantShares(
      amount,
      body.participantMemberIds,
      body.participantShares
    );

    if (error) {
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { publicId },
      include: {
        members: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { message: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const memberIds = new Set<number>(
      event.members.map((member: { id: number }) => member.id)
    );
    const uniqueParticipantIds = new Set<number>();

    if (!memberIds.has(payerMemberId)) {
      return NextResponse.json(
        { message: "支払った人がこのイベントのメンバーではありません" },
        { status: 400 }
      );
    }

    const hasInvalidParticipant = participantShares.some((share) => {
      if (uniqueParticipantIds.has(share.memberId)) {
        return true;
      }

      uniqueParticipantIds.add(share.memberId);

      return !memberIds.has(share.memberId);
    });

    if (hasInvalidParticipant) {
      return NextResponse.json(
        { message: "対象メンバーに不正な値があります" },
        { status: 400 }
      );
    }

    if (sumParticipantShares(participantShares) !== amount) {
      return NextResponse.json(
        { message: "参加者ごとの金額合計を支払い合計に合わせてください" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        eventId: event.id,
        payerMemberId,
        title,
        amount,
        participants: {
          create: participantShares.map((share) => ({
            memberId: share.memberId,
            shareAmount: share.amount,
          })),
        },
      },
      include: {
        payer: true,
        participants: {
          include: {
            member: true,
          },
        },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "支払い追加に失敗しました" },
      { status: 500 }
    );
  }
}
