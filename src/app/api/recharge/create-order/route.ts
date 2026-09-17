import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get("Authorization") || "",
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount < 10 || amount > 100000) {
      return NextResponse.json(
        { error: "Recharge amount must be between ₹10 and ₹1,00,000." },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          error: "Razorpay keys are missing on the server.",
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

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `recharge_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: user.id,
      },
    });

    const { error: insertError } = await supabase
      .from("wallet_recharges")
      .insert({
        user_id: user.id,
        amount,
        razorpay_order_id: order.id,
        status: "created",
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Could not save recharge record." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown Razorpay error";

    return NextResponse.json(
      { error: `Razorpay error: ${message}` },
      { status: 500 }
    );
  }
}
