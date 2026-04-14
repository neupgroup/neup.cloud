'use server';

import { revalidatePath } from 'next/cache';
import {
  createEnvironmentVariable as createEnvironmentVariableRecord,
  deleteEnvironmentVariable as deleteEnvironmentVariableRecord,
  getEnvironmentVariables as getEnvironmentVariablesData,
} from '@/services/environment-variables/data';

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  targetType: 'account' | 'server' | 'app';
  selectedTargets: string[];
  isConfidential: boolean;
  protectValue: boolean;
  createdAt?: string;
}

export async function getEnvironmentVariables() {
  try {
    const variables = await getEnvironmentVariablesData();
    return { variables };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createEnvironmentVariable(data: Omit<EnvironmentVariable, 'id' | 'createdAt'>) {
  try {
    await createEnvironmentVariableRecord(data);
    revalidatePath('/environments');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteEnvironmentVariable(id: string) {
  try {
    await deleteEnvironmentVariableRecord(id);
    revalidatePath('/environments');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
