export default function TokenCard({ token, icon }) {
  return (
    <div className="bg-cream-100 dark:bg-zen-700 p-6 rounded-lg border border-cream-300 dark:border-zen-600 hover:border-briq-orange dark:hover:border-briq-orange transition-all duration-200 min-w-[120px]">
      <div className="text-center">
        {icon && (
          <div className="text-3xl mb-2">{icon}</div>
        )}
        <h3 className="text-lg font-medium text-zen-900 dark:text-cream-100 mb-1">
          {token}
        </h3>
      </div>
    </div>
  );
}
