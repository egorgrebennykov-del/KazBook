const TABLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/orders_in_progress`;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function createOrderInProgress({
  userId,
  orderNumber,
  items,
  address,
  itemsSubtotal,
  shippingCost,
  finalTotal,
}) {
  try {
    const response = await fetch(TABLE_URL, {
      method: "POST",
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        content: {
          orderNumber,
          items,
          address,
          itemsSubtotal,
          shippingCost,
          finalTotal,
          createdAt: new Date().toISOString(),
        },
        ststus: "in_progress",
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      console.warn("Could not record order in orders_in_progress:", err);
    }
  } catch (err) {
    console.warn("Error creating order:", err);
  }
}
