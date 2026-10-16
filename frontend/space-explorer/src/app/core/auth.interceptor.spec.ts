import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserNavigation, authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let assign: jasmine.Spy;
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    assign = jasmine.createSpy('assign');
    const navigation = { currentUrl: () => '/A/compartiments?x=1', assign };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: BrowserNavigation, useValue: navigation },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  it('sends the browser to the SSO login on 401, coming back to the current page', () => {
    let errored = false;
    http.get('/api/me').subscribe({ error: () => (errored = true) });

    controller.expectOne('/api/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(assign).toHaveBeenCalledOnceWith('/auth/login?returnUrl=%2FA%2Fcompartiments%3Fx%3D1');
    expect(errored).toBeFalse();
  });

  it('lets other errors through', () => {
    let status = 0;
    http.get('/api/spaces/A/raw').subscribe({ error: (e) => (status = e.status) });

    controller.expectOne('/api/spaces/A/raw').flush(null, { status: 503, statusText: 'Unavailable' });

    expect(status).toBe(503);
    expect(assign).not.toHaveBeenCalled();
  });
});
