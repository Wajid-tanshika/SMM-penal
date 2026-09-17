import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export const runtime = "nodejs";

export async function GET() {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay environment variables are missing.",
          keyIdPresent: Boolean(keyId),
          keySecretPresent: Boolean(keySecret),
        },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const payments = await razorpay.payments.all({
      count: 1,
    });

    return NextResponse.json({
      success: true,
      message: "Razorpay authentication is working.",
      testModeKey: keyId.startsWith("rzp_test_"),
      paymentCountReturned: payments.items?.length ?? 0,
    });
  } catch (error) {
    console.error("Razorpay diagnostic error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Razorpay error",
      },
      { status: 500 }
    );
  }
}
