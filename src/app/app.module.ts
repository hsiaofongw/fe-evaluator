import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { PseudoTerminalComponent } from './pseudo-terminal/pseudo-terminal.component';
import { PseudoTerminalConfigurationComponent } from './pseudo-terminal-configuration/pseudo-terminal-configuration.component';

@NgModule({
  declarations: [
    AppComponent,
    PseudoTerminalComponent,
    PseudoTerminalConfigurationComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
