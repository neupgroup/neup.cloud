"use server";

import {
  getInfrastructureRecommendations,
  type InfrastructureRecommendationsInput,
} from "@/ai/flows/infrastructure-recommendations";

export async function getRecommendations(
  input: InfrastructureRecommendationsInput
) {
  const result = await getInfrastructureRecommendations(input);
  return result;
}
