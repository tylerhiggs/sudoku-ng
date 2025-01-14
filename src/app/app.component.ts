import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChangeDetectionStrategy } from '@angular/core';
import { SudokuTableComponent } from './sudoku-table/sudoku-table.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SudokuTableComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
