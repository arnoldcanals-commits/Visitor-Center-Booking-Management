import {
  Smartphone,
  Wallet,
  Banknote,
  Building2,
  CreditCard,
  Globe,
} from "lucide-react";

export default function PaymentMethodSelector({ value, onChange }) {
  const options = [
    { key: "gcash", label: "GCash", icon: Smartphone, color: "text-blue-500" },
    { key: "maya", label: "Maya", icon: Wallet, color: "text-green-600" },
    { key: "cash", label: "Walk-in / Cash", icon: Banknote, color: "text-emerald-600" },
    { key: "bank", label: "Bank Transfer", icon: Building2, color: "text-gray-700" },
    { key: "paypal", label: "PayPal", icon: Globe, color: "text-blue-600" },
    { key: "stripe", label: "Card (Stripe)", icon: CreditCard, color: "text-indigo-600" },
  ];

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-600 mb-2">
        Payment Method
      </label>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;

          return (
            <label
              key={opt.key}
              className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="payment"
                value={opt.key}
                checked={value === opt.key}
                onChange={(e) => onChange(e.target.value)}
              />

              <Icon size={18} className={opt.color} />
              {opt.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}