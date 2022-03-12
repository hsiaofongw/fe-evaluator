import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PseudoTerminalComponent } from './pseudo-terminal.component';

describe('PseudoTerminalComponent', () => {
  let component: PseudoTerminalComponent;
  let fixture: ComponentFixture<PseudoTerminalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PseudoTerminalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PseudoTerminalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
