import type { IFeatureRepository } from "@calcom/features/flags/repositories/PrismaFeatureRepository";
import { moduleLoader as cachedFeatureRepositoryModuleLoader } from "../../flags/di/CachedFeatureRepository.module";
import { moduleLoader as prismaFeatureRepositoryModuleLoader } from "../../flags/di/PrismaFeatureRepository.module";
import { type Container, createContainer } from "../di";

const featureRepositoryContainer: Container = createContainer();

export function getFeatureRepository(): IFeatureRepository {
  cachedFeatureRepositoryModuleLoader.loadModule(featureRepositoryContainer);
  return featureRepositoryContainer.get<IFeatureRepository>(cachedFeatureRepositoryModuleLoader.token);
}

export function getPrismaFeatureRepository(): IFeatureRepository {
  prismaFeatureRepositoryModuleLoader.loadModule(featureRepositoryContainer);
  return featureRepositoryContainer.get<IFeatureRepository>(prismaFeatureRepositoryModuleLoader.token);
}
