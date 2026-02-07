export function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h1 className="text-2xl font-heading font-semibold mb-2">{title}</h1>
            <p className="text-gray-500">Tính năng này sẽ được phát triển trong Phase 1</p>
        </div>
    );
}
