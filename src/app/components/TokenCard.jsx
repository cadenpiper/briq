import { TokenIcon } from './icons';

export default function TokenCard({ token, status }) {
  return (
    <div className="flex items-center gap-3 bg-cream-100 dark:bg-zen-700 border border-cream-300 dark:border-zen-600 px-4 py-3 rounded-lg transition-colors duration-200 hover:bg-cream-200 dark:hover:bg-zen-600">
      <TokenIcon token={token} size={32} />
      <div className="flex flex-col">
        <span className="font-medium text-zen-900 dark:text-cream-100">{token}</span>
        {status && (
          <span className="text-sm text-zen-600 dark:text-cream-400">{status}</span>
        )}
      </div>
    </div>
  );
}
