import { NextRequest, NextResponse } from "next/server";

const KHORA_API_BASE = "https://khora.fun";
const BOOA_CONTRACT = "0x7aecA981734d133d3f695937508C48483BA6b654";

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
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
