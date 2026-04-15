'use server';

import type { ExternalDatabase } from '@/services/database/types';
import { getDatabases as getDatabasesData } from '@/services/database/data';

export async function getDatabases(): Promise<ExternalDatabase[]> {
	try {
		return await getDatabasesData();
	} catch (error) {
		console.error('Failed to load databases:', error);
		return [];
	}
}
