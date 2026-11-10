// Линейные иконки 24×24 в духе набора приложений (stroke 2, скруглённые концы).
const PATHS = {
    'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
    clipboard: (
        <>
            <rect x="6" y="4" width="12" height="17" rx="2" />
            <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
        </>
    ),
    check: <path d="m5 12 5 5 9-10" />,
    flash: <path d="M13 3 5 13h6l-1 8 8-10h-6l1-8z" />,
    'check-circle': (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
        </>
    ),
    'credit-card': (
        <>
            <rect x="3" y="6" width="18" height="13" rx="2" />
            <path d="M3 10h18M7 15h4" />
        </>
    ),
    phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
    copy: (
        <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a1 1 0 0 1 1-1h10" />
        </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    bank: <path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />,
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            {PATHS[name]}
        </svg>
    );
}
