import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "../../../src/lib/prisma";

type CreateEventBody = {
  eventName?: string;
  members?: string[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateEventBody;

    const eventName = body.eventName?.trim() ?? "";
    const members =
      body.members?.map((name) => name.trim()).filter((name) => name.length > 0) ??
      [];

    const uniqueMembers = [...new Set(members)];

    if (!eventName) {
      return NextResponse.json(
        { message: "イベント名を入力してください" },
        { status: 400 }
      );
    }

    if (uniqueMembers.length === 0) {
      return NextResponse.json(
        { message: "メンバーを1人以上追加してください" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        publicId: `evt_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        name: eventName,
        members: {
          create: uniqueMembers.map((name) => ({ name })),
        },
      },
      include: {
        members: true,
      },
    });

    return NextResponse.json(
      {
        publicId: event.publicId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "イベント作成に失敗しました" },
      { status: 500 }
    );
  }
}