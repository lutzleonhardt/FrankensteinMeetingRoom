import {
  ApplicationConfig,
  InjectionToken,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import type { NativeFederationResult } from '@softarc/native-federation-orchestrator';

export const MODULE_LOADER = new InjectionToken<NativeFederationResult>('MODULE_LOADER');

export const appConfig = (nf: NativeFederationResult): ApplicationConfig => ({
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: MODULE_LOADER, useValue: nf },
  ],
});
