import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();

  const order = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    product: formData.get("product"),
    quantity: formData.get("quantity"),
    location: formData.get("location"),
    note: formData.get("note"),
    createdAt: new Date().toISOString(),
  };

  console.log("New TrekShield order:", order);

  return NextResponse.json({
    ok: true,
    message: "Order received",
  });
}