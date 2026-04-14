import React from 'react';
import NginxConfigEditor from '@/components/webservices/nginx/NginxConfigEditor';

export default function NewNginxConfigPage() {
    return (
        <React.Suspense fallback={null}>
            <NginxConfigEditor />
        </React.Suspense>
    );
}
