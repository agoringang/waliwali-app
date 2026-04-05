import { NextResponse } from "next/server";
import { prisma } from "../../../../../../src/lib/prisma";

type ToggleSettlementBody = {
  fromMemberId?: number;
  toMemberId?: number;
  amount?: number;
};

type Props = {
  params: Promise<{
    publicId: string;
  }>;
};

export async function POST(req: Request, { params }: Props) {
  try {
    const { publicId } = await params;
    const body = (await req.json()) as ToggleSettlementBody;

    const rawFromMemberId = body.fromMemberId;
    const rawToMemberId = body.toMemberId;
    const rawAmount = body.amount;

    if (
      !publicId ||
      typeof rawFromMemberId !== "number" ||
      !Number.isInteger(rawFromMemberId) ||
      typeof rawToMemberId !== "number" ||
      !Number.isInteger(rawToMemberId) ||
      typeof rawAmount !== "number" ||
      !Number.isFinite(rawAmount) ||
      rawAmount <= 0
    ) {
      return NextResponse.json(
        { message: "入力内容が不正です" },
        { status: 400 }
      );
    }

    const fromMemberId = rawFromMemberId;
    const toMemberId = rawToMemberId;
    const amount = rawAmount;

    const event = await prisma.event.findUnique({
      where: { publicId },
    });

    if (!event) {
      return NextResponse.json(
        { message: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    const existing = await prisma.settlementCompletion.findFirst({
      where: {
        eventId: event.id,
        fromMemberId,
        toMemberId,
        amount,
      },
    });

    if (!existing) {
      const created = await prisma.settlementCompletion.create({
        data: {
          eventId: event.id,
          fromMemberId,
          toMemberId,
          amount,
          isCompleted: true,
        },
      });

      return NextResponse.json(created, { status: 201 });
    }

    const updated = await prisma.settlementCompletion.update({
      where: {
        id: existing.id,
      },
      data: {
        isCompleted: !existing.isCompleted,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "完了状態の更新に失敗しました" },
      { status: 500 }
    );
  }
}