'use client';

import { useState, useEffect } from 'react';
import Cookies from 'universal-cookie';
import { getServer } from '@/app/servers/actions';

export function useServerName() {
    const [serverName, setServerName] = useState<string | null>(null);

    useEffect(() => {
        const fetchName = async () => {
            const cookies = new Cookies(null, { path: '/' });
            const serverId = cookies.get('selected_server');

            if (!serverId) {
                setServerName(null);
                return;
            }

            // 1. Try Session Storage for instant hit
            const cached = sessionStorage.getItem(`server_name_${serverId}`);
            if (cached) {
                setServerName(cached);
                return;
            }

            // 2. Try Cookie if session storage is empty
            const cookieName = cookies.get('selected_server_name');
            if (cookieName) {
                setServerName(cookieName);
                sessionStorage.setItem(`server_name_${serverId}`, cookieName);
                return;
            }

            // 3. Fallback: Fetch once from the server and cache
            try {
                const server = await getServer(serverId);
                if (server?.name) {
                    setServerName(server.name);
                    sessionStorage.setItem(`server_name_${serverId}`, server.name);
                }
            } catch (error) {
                console.error("Failed to fetch server name for cache:", error);
            }
        };

        fetchName();
    }, []);

    return serverName;
}
