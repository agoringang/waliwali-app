const OTHER_APPS_URL = "https://agoringang.com/#apps";

type Props = {
  className?: string;
};

export default function OtherAppsLink({ className = "" }: Props) {
  return (
    <a
      href={OTHER_APPS_URL}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-2 rounded-full border border-amber-500/15 bg-white/84 px-4 py-2 text-[13px] font-semibold text-amber-800 shadow-[0_14px_34px_rgba(120,53,15,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-amber-500/25 hover:text-amber-900 ${className}`}
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/12 text-amber-700">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <rect x="4" y="4" width="6" height="6" rx="1.2" />
          <rect x="14" y="4" width="6" height="6" rx="1.2" />
          <rect x="4" y="14" width="6" height="6" rx="1.2" />
          <rect x="14" y="14" width="6" height="6" rx="1.2" />
        </svg>
      </span>
      他のアプリを見る
    </a>
  );
}
