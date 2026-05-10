import { bootstrapApplication } from '@angular/platform-browser';
import type { NativeFederationResult } from '@softarc/native-federation-orchestrator';
import { App } from './app/app';
import { appConfig } from './app/app.config';

export const bootstrap = (nf: NativeFederationResult) =>
  bootstrapApplication(App, appConfig(nf)).catch((err) => console.error(err));
