import { TestBed } from '@angular/core/testing';

import { SnackbarStoreService } from './snackbar-store.service';

describe('SnackbarStoreService', () => {
  let service: SnackbarStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SnackbarStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
