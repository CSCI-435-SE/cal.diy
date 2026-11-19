import { PrismaOidcProviderRepository } from "@calcom/features/auth/oidc/repositories/PrismaOidcProviderRepository";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { OIDC_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = OIDC_DI_TOKENS.OIDC_PROVIDER_REPOSITORY;
const moduleToken = OIDC_DI_TOKENS.OIDC_PROVIDER_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaOidcProviderRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaOidcProviderRepository };
