import { NextResponse } from "next/server";
import { prisma } from "../../../../../../src/lib/prisma";

type UpdateExpenseBody = {
  payerMemberId?: number;
  title?: string;
  amount?: number;
  participantMemberIds?: number[];
};

type Props = {
  params: Promise<{
    publicId: string;
    expenseId: string;
  }>;
};

export async function PATCH(req: Request, { params }: Props) {
  try {
    const { publicId, expenseId } = await params;
    const body = (await req.json()) as UpdateExpenseBody;

    const parsedExpenseId = Number(expenseId);
    const rawPayerMemberId = body.payerMemberId;
    const rawTitle = body.title;
    const rawAmount = body.amount;
    const rawParticipantMemberIds = body.participantMemberIds;

    if (
      !publicId ||
      !Number.isInteger(parsedExpenseId) ||
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
        { message: "入力内容が不正です" },
        { status: 400 }
      );
    }

    const payerMemberId = rawPayerMemberId;
    const title = rawTitle.trim();
    const amount = rawAmount;
    const participantMemberIds = rawParticipantMemberIds;

    const event = await prisma.event.findUnique({
      where: { publicId },
      include: { members: true },
    });

    if (!event) {
      return NextResponse.json(
        { message: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const expense = await prisma.expense.findFirst({
      where: {
        id: parsedExpenseId,
        eventId: event.id,
      },
    });

    if (!expense) {
      return NextResponse.json(
        { message: "支払いが見つかりません" },
        { status: 404 }
      );
    }

    const memberIds = new Set<number>(event.members.map((member) => member.id));

    if (!memberIds.has(payerMemberId)) {
      return NextResponse.json(
        { message: "支払った人がイベントメンバーではありません" },
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

    await prisma.expenseParticipant.deleteMany({
      where: {
        expenseId: parsedExpenseId,
      },
    });

    const updatedExpense = await prisma.expense.update({
      where: {
        id: parsedExpenseId,
      },
      data: {
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

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "支払い編集に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Props) {
  try {
    const { publicId, expenseId } = await params;
    const parsedExpenseId = Number(expenseId);

    if (!publicId || !Number.isInteger(parsedExpenseId)) {
      return NextResponse.json(
        { message: "不正なリクエストです" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { publicId },
    });

    if (!event) {
      return NextResponse.json(
        { message: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const expense = await prisma.expense.findFirst({
      where: {
        id: parsedExpenseId,
        eventId: event.id,
      },
    });

    if (!expense) {
      return NextResponse.json(
        { message: "支払いが見つかりません" },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: {
        id: parsedExpenseId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "支払い削除に失敗しました" },
      { status: 500 }
    );
  }
}