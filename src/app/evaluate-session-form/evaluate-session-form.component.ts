import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Evaluator } from '../evaluate.service';
import { EvaluateSessionCreationConfig } from '../interfaces';

@Component({
  selector: 'app-evaluate-session-form',
  templateUrl: './evaluate-session-form.component.html',
  styleUrls: ['./evaluate-session-form.component.scss'],
})
export class EvaluateSessionFormComponent implements OnInit {
  @Output()
  onValidityChange = new EventEmitter<boolean>();

  form = new FormGroup({
    serverAddr: new FormControl(null, [Validators.required]),
    friendlyName: new FormControl(null),
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      this.onValidityChange.emit(this.form.valid);
    });
  }

  public getValue(): EvaluateSessionCreationConfig | undefined {
    const serverAddr = this.form.get('serverAddr')?.value;
    const friendlyName = this.form.get('friendlyName')?.value;
    if (typeof serverAddr === 'string' && serverAddr.length > 0) {
      const config: EvaluateSessionCreationConfig = {
        serverAddr,
      };
      if (typeof friendlyName === 'string' && friendlyName.length > 0) {
        config.friendlyName = friendlyName;
      }
      return config;
    }

    return undefined;
  }
}
