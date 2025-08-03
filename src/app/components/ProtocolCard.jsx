export default function ProtocolCard({ name, apy, description, icon }) {
  return (
    <div className="bg-cream-100 dark:bg-zen-700 p-4 rounded-lg border border-cream-300 dark:border-zen-600 hover:border-briq-orange dark:hover:border-briq-orange transition-all duration-200 w-fit min-w-[200px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="text-xl">{icon}</div>}
          <h3 className="text-lg font-medium text-zen-900 dark:text-cream-100 whitespace-nowrap">
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
        <p className="text-zen-700 dark:text-cream-200 text-sm mt-3">
          {description}
        </p>
      )}
    </div>
  );
}
