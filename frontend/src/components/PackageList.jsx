import PackageCard from "./PackageCard";
import "../styles/Home.css";

export default function PackageList({ packages }) {
  if (!packages || packages.length === 0) {
    return <p>No packages available.</p>;
  }

  return (
    <div
      className="
        packages-wrapper
        grid
        grid-cols-[repeat(auto-fit,minmax(225px,auto))] /* changed max width to auto */
        gap-5
        justify-start /* prevents lone card from stretching */
      "
    >
      {packages.map((pkg) => (
        <PackageCard key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
}
