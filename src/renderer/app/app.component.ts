import { Component } from '@angular/core';

/**
 * Pusta powloka Etapu 1. Routing, design system i widoki sa zakresem kolejnego
 * etapu - tu jest tylko tyle, zeby okno sie otwieralo i zeby testy E2E mialy
 * w co kliknac.
 */
@Component({
  selector: 'app-root',
  template: `
    <main data-testid="app-shell">
      <h1>Universal AI Skills Manager</h1>
      <p data-testid="app-stage">Etap 1: szkielet aplikacji i infrastruktura</p>
    </main>
  `,
})
export class AppComponent {}
