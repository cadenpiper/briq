import { ProtocolIcon } from './icons';

export default function ProtocolCard({ name }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-cream-100 dark:bg-zen-700 border border-cream-300 dark:border-zen-600 px-3 sm:px-4 py-3 sm:py-3 rounded-lg transition-colors duration-200 hover:bg-cream-200 dark:hover:bg-zen-600 w-full sm:w-auto max-w-[220px]">
      <ProtocolIcon protocol={name} size={28} className="sm:w-8 sm:h-8 flex-shrink-0" />
      <span className="font-medium text-zen-900 dark:text-cream-100 text-sm sm:text-base truncate text-center sm:text-left">{name}</span>
    </div>
  );
}
