import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";

type CreateExpenseBody = {
  payerMemberId?: number;
  title?: string;
  amount?: number;
  participantMemberIds?: number[];
};

type Props = {
  params: Promise<{
    publicId: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
  try {
    const { publicId } = await params;
    const body = (await req.json()) as CreateExpenseBody;

    const rawPayerMemberId = body.payerMemberId;
    const rawTitle = body.title;
    const rawAmount = body.amount;
    const rawParticipantMemberIds = body.participantMemberIds;

    if (
      !publicId ||
      typeof rawPayerMemberId !== "number" ||
      !Number.isInteger(rawPayerMemberId) ||
      typeof rawTitle !== "string" ||
      !rawTitle.trim() ||
      typeof rawAmount !== "number" ||
      !Number.isFinite(rawAmount) ||
      rawAmount <= 0 ||
      !Array.isArray(rawParticipantMemberIds) ||
      rawParticipantMemberIds.length === 0 ||
      rawParticipantMemberIds.some(
        (id) => typeof id !== "number" || !Number.isInteger(id)
      )
    ) {
      return NextResponse.json(
        { message: "支払い情報が不足しています" },
        { status: 400 }
      );
    }

    const payerMemberId = rawPayerMemberId;
    const title = rawTitle.trim();
    const amount = rawAmount;
    const participantMemberIds = rawParticipantMemberIds;

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

    if (!memberIds.has(payerMemberId)) {
      return NextResponse.json(
        { message: "支払った人がこのイベントのメンバーではありません" },
        { status: 400 }
      );
    }

    const hasInvalidParticipant = participantMemberIds.some(
      (id) => !memberIds.has(id)
    );

    if (hasInvalidParticipant) {
      return NextResponse.json(
        { message: "対象メンバーに不正な値があります" },
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
          create: participantMemberIds.map((memberId) => ({
            memberId,
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