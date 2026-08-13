import { NextRequest, NextResponse } from "next/server";
import {
  createCustomerToken,
  CUSTOMER_COOKIE,
  readCustomerToken,
} from "@/lib/session";

export async function middleware(request: NextRequest) {
  const current = request.cookies.get(CUSTOMER_COOKIE)?.value;
  if (await readCustomerToken(current)) return NextResponse.next();

  const token = await createCustomerToken();
  request.cookies.set(CUSTOMER_COOKIE, token);
  const response = NextResponse.next({ request });
  response.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!api/webhooks/stripe|api/fulfillment/tracking|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
