import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { EventTypeFavoriteRepository } from "../repositories/EventTypeFavoriteRepository";

const thisModule = createModule();
const token = DI_TOKENS.EVENT_TYPE_FAVORITE_REPOSITORY;
const moduleToken = DI_TOKENS.EVENT_TYPE_FAVORITE_REPOSITORY_MODULE;

// tells the container to build EventTypeFavoriteRepository
// and supply the shared Prisma client to its container
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: EventTypeFavoriteRepository,
  dep: prismaModuleLoader,
});

// loader object exported so container files can register setup instructions
export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

// to re-export the class as a type
export type { EventTypeFavoriteRepository };
