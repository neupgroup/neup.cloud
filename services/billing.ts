export const invoices = [
  { date: "June 1, 2024", amount: "$50.00" },
  { date: "May 1, 2024", amount: "$50.00" },
  { date: "April 1, 2024", amount: "$50.00" },
  { date: "March 1, 2024", amount: "$40.00" },
];

export function getBillingPageData() {
  return {
    plan: {
      name: "Pro",
      price: "$50",
      nextPayment: "July 1, 2024",
    },
    paymentMethod: {
      type: "Visa",
      last4: "1234",
      expires: "12/26",
    },
    invoices,
  };
}
