'use server';

import { revalidatePath } from 'next/cache';
import {
  createCommandSet as createCommandSetRecord,
  deleteCommandSet as deleteCommandSetRecord,
  getCommandSetById,
  getCommandSetsByUserId,
  updateCommandSet as updateCommandSetRecord,
} from '@/services/command-sets/data';

export interface CommandSetCommand {
  id: string;
  title: string;
  command: string;
  description?: string;
  order: number;
  isSkippable?: boolean;
  isRepeatable?: boolean;
}

export interface CommandSet {
  id: string;
  userId: string;
  name: string;
  description?: string;
  commands: CommandSetCommand[];
  createdAt?: string;
}

export async function createCommandSet(data: Omit<CommandSet, 'id' | 'createdAt'>) {
  try {
    const commandSet = await createCommandSetRecord(data);
    revalidatePath('/commands/set');
    return { success: true, id: commandSet.id };
  } catch (error: any) {
    console.error('Error creating command set:', error);
    return { success: false, error: error.message };
  }
}

export async function getCommandSets(userId: string) {
  if (!userId) {
    return [];
  }

  try {
    return await getCommandSetsByUserId(userId);
  } catch (error: any) {
    console.error('Error fetching command sets:', error);
    return [];
  }
}

export async function getCommandSet(id: string) {
  try {
    return await getCommandSetById(id);
  } catch (error: any) {
    console.error('Error fetching command set:', error);
    return null;
  }
}

export async function updateCommandSet(id: string, data: Partial<Omit<CommandSet, 'id' | 'createdAt' | 'userId'>>) {
  try {
    await updateCommandSetRecord(id, data);
    revalidatePath('/commands/set');
    revalidatePath(`/commands/set/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating command set:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCommandSet(id: string) {
  try {
    await deleteCommandSetRecord(id);
    revalidatePath('/commands/set');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting command set:', error);
    return { success: false, error: error.message };
  }
}
