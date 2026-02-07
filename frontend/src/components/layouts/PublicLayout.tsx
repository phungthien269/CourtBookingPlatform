import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectionStatus } from '../ConnectionStatus';

export function PublicLayout() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-white shadow-sm fixed top-0 left-0 right-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">C</span>
                            </div>
                            <span className="font-heading font-semibold text-lg">CourtBooking</span>
                        </Link>

                        {/* Auth buttons */}
                        <div className="flex items-center gap-4">
                            {user ? (
                                <Link
                                    to={user.role === 'ADMIN' ? '/admin' : user.role === 'MANAGER' ? '/manager' : '/me/bookings'}
                                    className="btn-primary"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link to="/auth/login" className="text-gray-600 hover:text-gray-900">
                                        Đăng nhập
                                    </Link>
                                    <Link to="/auth/register" className="btn-primary">
                                        Đăng ký
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className="pt-16">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-auto">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex justify-between items-center text-sm text-gray-500">
                        <p>© 2026 CourtBooking. All rights reserved.</p>
                        <p>Hotline: 1900 xxxx xx</p>
                    </div>
                </div>
            </footer>

            <ConnectionStatus />
        </div>
    );
}
