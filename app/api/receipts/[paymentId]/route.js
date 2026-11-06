import { NextResponse } from "next/server";
import {
  AuthenticationRequiredError,
  requireCurrentUser,
} from "@/features/auth/server";
import { isAdministratorRole, isMemberRole } from "@/features/auth/authorization.mjs";
import { getPaymentReceiptDetails } from "@/features/billing/receipts";
import { createPaymentReceiptPdf } from "@/lib/receipt-pdf.mjs";

export async function GET(_request, { params }) {
  let currentUser;
  try {
    currentUser = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    throw error;
  }

  const isAdmin = isAdministratorRole(currentUser.role);
  if (!isAdmin && !isMemberRole(currentUser.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { paymentId } = await params;
  const receipt = await getPaymentReceiptDetails(paymentId, currentUser);
  if (!receipt || receipt.status !== "ok") {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }
  const pdf = createPaymentReceiptPdf({
    payment: receipt.payment,
    subscription: receipt.subscription,
    member: receipt.member,
    businessName: process.env.RECEIPT_BUSINESS_NAME || "Fitness Club",
    businessContact: process.env.RECEIPT_BUSINESS_CONTACT || "",
  });
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receipt.payment.receiptNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
