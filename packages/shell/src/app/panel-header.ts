import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

type Framework = 'angular' | 'react' | 'svelte';

const LOGOS: Record<Framework, string> = {
  angular: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 250 250" width="14" height="14" aria-hidden="true"><path d="M125 30 230 67.5 213 233l-88 28-88-28L20 67.5z" fill="currentColor" fill-opacity=".18"/><path d="M125 30v231l88-28 17-165.5z" fill="currentColor" fill-opacity=".32"/><path d="M125 52.1 60.2 197.3h24.2l13-32.5h54.8l13 32.5H189zm0 46.4 20.7 50.7h-41.4z" fill="currentColor"/></svg>`,
  react: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.5 -10.23 23 20.46" width="14" height="14" aria-hidden="true"><circle r="2.05" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="1"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/></g></svg>`,
  svelte: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98.1 118" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M91.8 15.6C80.9-.1 59.2-4.7 43.6 5.2L16.1 22.8C8.6 27.5 3.4 35.2 1.9 43.9c-1.3 7.3-.2 14.8 3.3 21.3-2.4 3.6-4 7.6-4.7 11.8-1.6 8.9.5 18 5.7 25.4 11 15.7 32.6 20.3 48.2 10.4l27.5-17.5c7.5-4.7 12.7-12.4 14.2-21.1 1.3-7.3.2-14.8-3.3-21.3 2.4-3.6 4-7.6 4.8-11.8 1.5-8.9-.6-18-5.8-25.5"/><path fill="#fff" d="M40.9 103.9c-8.9 2.3-18.2-1.2-23.4-8.7-3.2-4.5-4.4-10-3.5-15.4.2-.9.4-1.7.6-2.6l.5-1.6 1.4 1c3.3 2.4 6.9 4.2 10.8 5.4l1 .3-.1 1c-.1 1.4.3 2.9 1.1 4.1 1.6 2.3 4.4 3.4 7.1 2.6.6-.2 1.2-.4 1.8-.8L65.6 72c1.4-.9 2.4-2.3 2.7-3.9.3-1.7-.1-3.4-1.1-4.8-1.6-2.3-4.4-3.3-7.1-2.6-.6.2-1.2.4-1.8.8l-10.5 6.7c-1.9 1.2-4 2.1-6.2 2.7-8.9 2.3-18.2-1.2-23.4-8.7-3.1-4.5-4.4-10-3.4-15.4.9-5.3 4.1-10 8.7-12.8L51.2 16.5c1.9-1.2 4-2.1 6.2-2.7 8.9-2.3 18.2 1.2 23.4 8.7 3.2 4.5 4.4 10 3.5 15.4-.2.9-.4 1.7-.7 2.6l-.5 1.6-1.4-1c-3.3-2.4-6.9-4.2-10.8-5.4l-1-.3.1-1c.1-1.4-.3-2.9-1.1-4.1-1.6-2.3-4.4-3.3-7.1-2.6-.6.2-1.2.4-1.8.8L32.4 46c-1.4.9-2.4 2.3-2.7 3.9-.3 1.7.1 3.4 1.1 4.8 1.6 2.3 4.4 3.3 7.1 2.6.6-.2 1.2-.4 1.8-.8l10.5-6.7c1.9-1.2 4-2.1 6.2-2.7 8.9-2.3 18.2 1.2 23.4 8.7 3.2 4.5 4.4 10 3.5 15.4-.9 5.3-4.1 10-8.7 12.8l-27.5 17.5c-1.9 1.2-4 2.1-6.2 2.7"/></svg>`,
};

const COLORS: Record<Framework, string> = {
  angular: '#DD0031',
  react: '#61DAFB',
  svelte: '#FF3E00',
};

// Brand-color background tint — keeps the chip's identity readable across the
// whole header without competing with the panel body. Cyan needs more alpha
// because the eye reads cyan as lighter than red/orange at equal opacity.
const BG_TINTS: Record<Framework, string> = {
  angular: 'rgba(221, 0, 49, 0.05)',
  react: 'rgba(97, 218, 251, 0.12)',
  svelte: 'rgba(255, 62, 0, 0.06)',
};

const LABELS: Record<Framework, string> = {
  angular: 'Angular',
  react: 'React',
  svelte: 'Svelte',
};

@Component({
  selector: 'app-panel-header',
  imports: [],
  templateUrl: './panel-header.html',
  styleUrl: './panel-header.css',
})
export class PanelHeader {
  private readonly sanitizer = inject(DomSanitizer);

  readonly title = input.required<string>();
  readonly framework = input.required<Framework>();
  readonly standaloneUrl = input<string | null>(null);

  // SVG bodies are build-time constants under our control, so bypassing the
  // sanitizer is safe. We cache the SafeHtml so we don't re-trust on every
  // change-detection pass.
  private readonly safeLogos: Record<Framework, SafeHtml> = {
    angular: this.sanitizer.bypassSecurityTrustHtml(LOGOS.angular),
    react: this.sanitizer.bypassSecurityTrustHtml(LOGOS.react),
    svelte: this.sanitizer.bypassSecurityTrustHtml(LOGOS.svelte),
  };

  readonly logoHtml = computed(() => this.safeLogos[this.framework()]);
  readonly chipColor = computed(() => COLORS[this.framework()]);
  readonly chipBg = computed(() => BG_TINTS[this.framework()]);
  readonly frameworkLabel = computed(() => LABELS[this.framework()]);
}
