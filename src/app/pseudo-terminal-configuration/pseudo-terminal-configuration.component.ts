import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-pseudo-terminal-configuration',
  templateUrl: './pseudo-terminal-configuration.component.html',
  styleUrls: ['./pseudo-terminal-configuration.component.scss']
})
export class PseudoTerminalConfigurationComponent implements OnInit {
  wordWrapCtrl = new FormControl(null);
  modeForm = new FormGroup({
    wordWrap: this.wordWrapCtrl,
  });
  
  constructor() { }

  ngOnInit(): void {
  }

}
