export default function ProtocolCard({ name, apy, description, icon }) {
  return (
    <div className="bg-cream-100 dark:bg-zen-700 p-6 rounded-lg border border-cream-300 dark:border-zen-600 hover:border-briq-orange dark:hover:border-briq-orange transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon && <div className="text-2xl">{icon}</div>}
          <h3 className="text-xl font-medium text-zen-900 dark:text-cream-100">
            {name}
          </h3>
        </div>
        {apy && (
          <div className="bg-briq-orange/20 text-briq-orange px-3 py-1 rounded-full text-sm font-medium">
            {apy} APY
          </div>
        )}
      </div>
      {description && (
        <p className="text-zen-700 dark:text-cream-200 text-sm">
          {description}
        </p>
      )}
    </div>
  );
}
