import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentPuzzleComponent } from './current-puzzle.component';

describe('CurrentPuzzleComponent', () => {
  let component: CurrentPuzzleComponent;
  let fixture: ComponentFixture<CurrentPuzzleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CurrentPuzzleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentPuzzleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
