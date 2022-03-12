import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluateSessionFormComponent } from './evaluate-session-form.component';

describe('EvaluateSessionFormComponent', () => {
  let component: EvaluateSessionFormComponent;
  let fixture: ComponentFixture<EvaluateSessionFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvaluateSessionFormComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EvaluateSessionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
