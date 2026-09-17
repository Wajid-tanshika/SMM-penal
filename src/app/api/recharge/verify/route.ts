import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: authorization,
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
        { error: "Invalid or expired login session." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const razorpayOrderId = String(body.razorpay_order_id || "");
    const razorpayPaymentId = String(body.razorpay_payment_id || "");
    const razorpaySignature = String(body.razorpay_signature || "");

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Incomplete payment details." },
        { status: 400 }
      );
    }

    const { data: recharge, error: rechargeError } = await supabase
      .from("wallet_recharges")
      .select("*")
      .eq("razorpay_order_id", razorpayOrderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (rechargeError || !recharge) {
      return NextResponse.json(
        { error: "Recharge record not found." },
        { status: 404 }
      );
    }

    if (recharge.status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Payment was already credited.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpaySignature)
      )
    ) {
      return NextResponse.json(
        { error: "Payment signature verification failed." },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (payment.order_id !== razorpayOrderId) {
      return NextResponse.json(
        { error: "Payment does not belong to this order." },
        { status: 400 }
      );
    }

    if (payment.status !== "captured") {
      return NextResponse.json(
        { error: `Payment is not captured. Current status: ${payment.status}` },
        { status: 400 }
      );
    }

    const expectedAmount = Math.round(Number(recharge.amount) * 100);

    if (Number(payment.amount) !== expectedAmount || payment.currency !== "INR") {
      return NextResponse.json(
        { error: "Payment amount verification failed." },
        { status: 400 }
      );
    }

    const { data: walletResult, error: walletError } = await supabase.rpc(
      "credit_verified_recharge",
      {
        p_user_id: user.id,
        p_amount: Number(recharge.amount),
        p_razorpay_order_id: razorpayOrderId,
        p_razorpay_payment_id: razorpayPaymentId,
      }
    );

    if (walletError) {
      console.error("Wallet credit error:", walletError);

      return NextResponse.json(
        { error: "Payment verified, but wallet credit failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and wallet credited.",
      balance: walletResult?.balance ?? null,
    });
  } catch (error) {
    console.error("Razorpay verification error:", error);

    return NextResponse.json(
      { error: "Payment verification failed." },
      { status: 500 }
    );
  }
}
