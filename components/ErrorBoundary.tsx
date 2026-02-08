import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
                    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-2xl w-full">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-4xl">⚠️</span>
                            </div>
                            <h1 className="text-2xl font-black text-red-600 mb-2">حدث خطأ في التطبيق</h1>
                            <p className="text-gray-600">عذراً، حدث خطأ غير متوقع. يرجى نسخ التفاصيل أدناه وإرسالها للدعم الفني.</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <p className="text-sm font-bold text-gray-700 mb-2">رسالة الخطأ:</p>
                            <pre className="text-xs text-red-600 bg-white p-3 rounded border border-red-200 overflow-auto" dir="ltr">
                                {this.state.error?.toString()}
                            </pre>
                        </div>

                        {this.state.errorInfo && (
                            <div className="bg-gray-50 rounded-xl p-4 mb-4">
                                <p className="text-sm font-bold text-gray-700 mb-2">تفاصيل إضافية:</p>
                                <pre className="text-xs text-gray-600 bg-white p-3 rounded border border-gray-200 overflow-auto max-h-60" dir="ltr">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </div>
                        )}

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            إعادة تحميل الصفحة
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
