import { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";

export default function StationProfile() {
  const { user } = useContext(AuthContext);

  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <div className="bg-white border rounded-lg shadow p-4 space-y-3">
        <h2 className="text-lg font-semibold text-teal-600">
          Profile
        </h2>

        <div className="text-sm">
          <span className="font-medium text-gray-600">
            Username:
          </span>{" "}
          {user?.username || "—"}
        </div>

        <div className="text-sm">
          <span className="font-medium text-gray-600">
            Role:
          </span>{" "}
          Station Staff
        </div>

        <div className="text-sm text-gray-500">
          This account is used for QR scanning and on-site
          verification.
        </div>
      </div>
    </div>
  );
}
