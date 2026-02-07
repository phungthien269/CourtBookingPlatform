import { useWebSocket } from '../hooks/useWebSocket';

export function ConnectionStatus() {
    const { isConnected } = useWebSocket();

    return (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-white px-3 py-2 rounded-full shadow-md text-sm">
            <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
            </span>
        </div>
    );
}
