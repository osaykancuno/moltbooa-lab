import { NextRequest, NextResponse } from "next/server";
import { KHORA_API_BASE, BOOA_CONTRACT } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${KHORA_API_BASE}/api/fetch-nfts?address=${address}&chain=shape&contract=${BOOA_CONTRACT}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Khora API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
