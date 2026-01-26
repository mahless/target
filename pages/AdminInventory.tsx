import React from 'react';

const AdminInventory: React.FC<any> = ({ stock = [] }) => {
    return (
        <div style={{ padding: '50px', textAlign: 'right', direction: 'rtl', color: 'black', background: 'white', minHeight: '100vh' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 'bold' }}>برنامج الفحص الشامل - المرحلة 2</h1>
            <p style={{ marginTop: '20px', fontSize: '18px' }}>إذا كنت ترى هذا النص، فالمشكلة كانت في المكونات المعقدة (مثل الأيقونات أو القوائم المخصصة).</p>

            <div style={{ marginTop: '30px', padding: '20px', border: '2px solid red', borderRadius: '15px' }}>
                <h2 style={{ fontWeight: 'bold' }}>بيانات التشخيص:</h2>
                <ul style={{ marginTop: '10px' }}>
                    <li>حالة المخزن: {Array.isArray(stock) ? 'مصفوفة سليمة' : 'ليست مصفوفة!'}</li>
                    <li>عدد السجلات: {stock.length}</li>
                    <li>الرابط الحالي: {window.location.hash}</li>
                </ul>
            </div>

            <div style={{ marginTop: '30px' }}>
                <button
                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                    style={{ background: 'red', color: 'white', padding: '15px 30px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                    تصفير شامل للذاكرة المؤقتة (Clear All Storage)
                </button>
            </div>

            <script dangerouslySetInnerHTML={{
                __html: `
                window.onerror = function(msg, url, line) {
                    alert('خطأ برمجي اكتشفناه: ' + msg + ' في السطر: ' + line);
                };
            `}} />
        </div>
    );
};

export default AdminInventory;
