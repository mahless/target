import React from 'react';

// تخلصنا من كل الـ imports الخارجية مؤقتاً
// حتى الـ props لن نقوم بفكها (destructuring) لتجنب أي خطأ
const AdminInventory: React.FC<any> = (props) => {
    console.log("AdminInventory Rendered", props);

    return (
        <div style={{ padding: '50px', background: 'red', color: 'white', fontSize: '24px', textAlign: 'center' }}>
            <h1>صفحة الطوارئ</h1>
            <p>إذا كنت ترى هذا، فالروت (Route) يعمل بشكل صحيح.</p>
            <p>عدد عناصر المخزن الواصلة: {props.stock ? props.stock.length : 'غير معروف'}</p>
            <button onClick={() => window.location.reload()} style={{ padding: '20px', background: 'black', color: 'white', marginTop: '20px' }}>
                RELOAD PAGE
            </button>
        </div>
    );
};

export default AdminInventory;
