import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { passphrase } = await req.json();
  const expected = process.env.ADMIN_PASSPHRASE;

  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSPHRASE is not configured on the server" }, { status: 500 });
  }

  return NextResponse.json({ ok: passphrase === expected });
}
