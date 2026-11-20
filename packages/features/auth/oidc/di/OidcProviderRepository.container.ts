import { createContainer } from "@calcom/features/di/di";
import {
  moduleLoader as oidcProviderRepositoryModuleLoader,
  type PrismaOidcProviderRepository,
} from "./OidcProviderRepository.module";

const oidcProviderRepositoryContainer = createContainer();

export function getOidcProviderRepository(): PrismaOidcProviderRepository {
  oidcProviderRepositoryModuleLoader.loadModule(oidcProviderRepositoryContainer);

  return oidcProviderRepositoryContainer.get<PrismaOidcProviderRepository>(
    oidcProviderRepositoryModuleLoader.token
  );
}
