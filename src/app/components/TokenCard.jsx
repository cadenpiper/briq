export default function TokenCard({ token, icon, status = "Active" }) {
  const statusColors = {
    "Active": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    "Coming Soon": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
  };

  return (
    <div className="bg-cream-100 dark:bg-zen-700 p-6 rounded-lg border border-cream-300 dark:border-zen-600 hover:border-briq-orange dark:hover:border-briq-orange transition-all duration-200 min-w-[120px]">
      <div className="text-center">
        {icon && (
          <div className="text-3xl mb-2">{icon}</div>
        )}
        <h3 className="text-lg font-medium text-zen-900 dark:text-cream-100 mb-2">
          {token}
        </h3>
        <div 
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors["Active"]}`}
          aria-label={`Status: ${status}`}
          role="status"
        >
          {status}
        </div>
      </div>
    </div>
  );
}
