import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PseudoTerminalConfigurationComponent } from './pseudo-terminal-configuration.component';

describe('PseudoTerminalConfigurationComponent', () => {
  let component: PseudoTerminalConfigurationComponent;
  let fixture: ComponentFixture<PseudoTerminalConfigurationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PseudoTerminalConfigurationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PseudoTerminalConfigurationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
