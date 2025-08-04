import { ProtocolIcon } from './icons';

export default function ProtocolCard({ name }) {
  return (
    <div className="flex items-center gap-3 bg-cream-100 dark:bg-zen-700 border border-cream-300 dark:border-zen-600 px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-cream-200 dark:hover:bg-zen-600">
      <ProtocolIcon protocol={name} size={32} />
      <span className="font-medium text-zen-900 dark:text-cream-100">{name}</span>
    </div>
  );
}
