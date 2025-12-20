export function applyCoupon(amount: number, coupon?: string) {
  if (!coupon) return { amount, discount: 0 };

  const code = coupon.trim().toUpperCase();

  if (code === "TRAVEL10") {
    const discount = Math.round(amount * 0.1);
    return {
      amount: amount - discount,
      discount,
    };
  }

  throw {
    statusCode: 400,
    message: "Invalid coupon code",
  };
}
