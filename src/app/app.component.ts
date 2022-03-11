import { HttpClient } from '@angular/common/http';
import {
  Component,
  Directive,
  ElementRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { from, interval, of } from 'rxjs';
import { delay, delayWhen, sample } from 'rxjs/operators';

/**
 * 换行方式
 *
 * 'CR': 用一个 0x0D 字符 '\r' 表示换行
 *
 * 'CRLF': 用 0x0D 字符 '\r', 而后紧接着一个 0x0A 字符 '\n' 表示换行
 *
 * 'LF': 用一个 0x0A 字符 '\n' 表示换行
 */
type LineFeed = 'CR' | 'CRLF' | 'LF';

type CharObject = {
  /** 文字的内容 */
  content: string;

  /** 文字在 Canvas 中的度量信息 */
  dimension: TextMetrics;

  /** 文字的基点的 x */
  x: number;

  /** 文字的基点的 y */
  y: number;

  /** 文字的盒子的最上边的 y */
  minY: number;

  /** 文字的盒子的最下边的 y */
  maxY: number;

  /** 文字的基点到盒子最下边的垂直距离 */
  boxDescent: number;

  /** 文字的基点到盒子最上边的垂直距离 */
  boxAscent: number;

  /** 行号，第一行是 0 */
  lineNumber: number;

  /** 实际显示行号，当 word-wrap 处于开启时，displayLineNumber >= lineNumber 恒成立 */
  displayLineNumber: number;
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  solarized = {
    $base03: '#002b36',
    $base02: '#073642',
    $base01: '#586e75',
    $base00: '#657b83',
    $base0: '#839496',
    $base1: '#93a1a1',
    $base2: '#eee8d5',
    $base3: '#fdf6e3',
    $yellow: '#b58900',
    $orange: '#cb4b16',
    $red: '#dc322f',
    $magenta: '#d33682',
    $violet: '#6c71c4',
    $blue: '#268bd2',
    $cyan: '#2aa198',
    $green: '#859900',
  };

  title = 'fe-evaluator';
  cursorColor = this.solarized.$base01;
  backgroundColor = this.solarized.$base02;
  textColor = this.solarized.$base1;
  scaleRatio = 1;
  defaultFontSize = 14;
  defaultFontFamily = 'Monaco';
  linePaddingLeft = 10;
  defaultLineFeed: LineFeed = 'LF';
  firstLinePaddingTop = 10;
  wordWrap = false;
  originWidth = 0;
  originHeight = 0;
  scaledWidth = 0;
  scaledHeight = 0;

  @ViewChild('pseudoTerminalRef', { read: ElementRef })
  pseudoTerminalRef?: ElementRef<HTMLDivElement>;

  @ViewChild('backgroundCanvasRef', { read: ElementRef })
  backgroundCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('textCanvasRef', { read: ElementRef })
  textCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('cursorRef', { read: ElementRef })
  cursorRef?: ElementRef<HTMLCanvasElement>;

  inputTextCtrl = new FormControl(null);
  wordWrapCtrl = new FormControl(false);
  modeForm = new FormGroup({
    wordWrap: this.wordWrapCtrl,
  });

  constructor(private httpClient: HttpClient) {}

  /** 将文字拆分成逻辑行 */
  private splitLineToLines(line: string, lineFeed: LineFeed): string[] {
    if (line.length === 0) {
      return [];
    }

    if (lineFeed === 'CR') {
      return line.split('\r');
    } else if (lineFeed === 'CRLF') {
      return line.split('\r\n');
    } else {
      return line.split('\n');
    }
  }

  /** 将文本内容拆分成一个 CharObject 数组 */
  private contentToCharObject(
    lines: string[],
    textContext: CanvasRenderingContext2D
  ): CharObject[] {
    const charObjs: CharObject[] = [];
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const content = lines[lineIdx];

      for (const char of content) {
        const metric = textContext.measureText(char);
        const charObj: CharObject = {
          content: char,
          dimension: metric,
          x: 0,
          y: 0,
          boxDescent: (metric as any).fontBoundingBoxDescent,
          boxAscent: (metric as any).fontBoundingBoxAscent,
          minY: 0,
          maxY: 0,
          lineNumber: lineIdx,
          displayLineNumber: lineIdx,
        };

        charObj.minY = charObj.y - charObj.boxAscent;
        charObj.maxY = charObj.y + charObj.boxDescent;

        charObjs.push(charObj);
      }
    }

    return charObjs;
  }

  /** 计算文本内容中每个文字的几何信息  */
  private calculateCharObjectGeometry(charObjs: CharObject[]): void {
    if (charObjs.length === 0) {
      return;
    }

    // 把第一个字平移到第一行第一列
    // 先把第一个字平移到第一行
    const topEdge = this.firstLinePaddingTop;
    const firtChar = charObjs[0];
    const disp = topEdge - firtChar.minY;
    firtChar.y = firtChar.y + disp;
    firtChar.maxY = firtChar.maxY + disp;
    // 然后把第一个字平移到第一列
    // firtChar.x = 0 - firtChar.dimension.actualBoundingBoxLeft;
    firtChar.x = this.linePaddingLeft;

    function charNewLine(
      char: CharObject,
      prevChar: CharObject,
      lineHeightFactor: number
    ): void {
      char.x = firtChar.x;
      char.y = prevChar.y + lineHeightFactor * (prevChar.maxY - prevChar.minY);
      char.displayLineNumber = prevChar.displayLineNumber + 1;
    }

    // 计算每一个 char 的 x 和 y 并且处理 word-wrap 和换行的情形
    let prevChar = firtChar;
    for (let i = 1; i < charObjs.length; i++) {
      const char = charObjs[i];

      char.x = prevChar.x + prevChar.dimension.width;

      if (prevChar.lineNumber < char.lineNumber) {
        charNewLine(char, prevChar, char.lineNumber - prevChar.lineNumber);
      } else if (
        this.wordWrap &&
        char.x + char.dimension.width > this.scaledWidth
      ) {
        charNewLine(char, prevChar, 1);
      } else {
        char.y = prevChar.y;
      }

      prevChar = char;
    }
  }

  private displayText(content: string): void {
    if (this.textCanvasRef) {
      const textCanvasElement = this.textCanvasRef.nativeElement;
      const textContext = textCanvasElement.getContext('2d');
      if (textContext) {
        textContext.clearRect(0, 0, this.scaledWidth, this.scaledHeight);
        textContext.fillStyle = this.textColor;
        textContext.font = `${this.defaultFontSize * this.scaleRatio}px ${
          this.defaultFontFamily
        }`;

        const charObjs: CharObject[] = this.contentToCharObject(
          this.splitLineToLines(content, this.defaultLineFeed),
          textContext
        );

        this.calculateCharObjectGeometry(charObjs);

        for (const char of charObjs) {
          textContext.fillText(char.content, char.x, char.y);
        }
      }
    }
  }

  private paintBackground(): void {
    if (this.backgroundCanvasRef) {
      const canvasElement = this.backgroundCanvasRef.nativeElement;
      const backgroundContext = canvasElement.getContext('2d');
      if (backgroundContext) {
        const width = canvasElement.width;
        const height = canvasElement.height;
        backgroundContext.fillStyle = this.backgroundColor;
        backgroundContext.fillRect(0, 0, width, height);
      }
    }
  }

  ngAfterViewInit(): void {
    if (this.pseudoTerminalRef) {
      const div = this.pseudoTerminalRef.nativeElement;
      const box = div.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      this.scaleRatio = ratio;
      const originWidth = box.width;
      const originHeight = box.height;
      const scaledWidth = originWidth * ratio;
      const scaledHeight = originHeight * ratio;
      this.scaledHeight = scaledHeight;
      this.scaledWidth = scaledWidth;
      this.originWidth = originWidth;
      this.originHeight = originHeight;

      const canvasLayers: HTMLCanvasElement[] = [];

      if (this.backgroundCanvasRef) {
        canvasLayers.push(this.backgroundCanvasRef.nativeElement);
      }

      if (this.textCanvasRef) {
        canvasLayers.push(this.textCanvasRef.nativeElement);
      }

      if (this.cursorRef) {
        canvasLayers.push(this.cursorRef.nativeElement);
      }

      for (const layer of canvasLayers) {
        layer.width = scaledWidth;
        layer.height = scaledHeight;
        layer.style.width = `${originWidth}px`;
        layer.style.height = `${originHeight}px`;
      }
    }

    this.paintBackground();

    this.inputTextCtrl.valueChanges.subscribe((content) => {
      if (typeof content === 'string') {
        this.displayText(content);
      }
    });

    this.modeForm.valueChanges.subscribe((mode) => {
      this.wordWrap = !!(mode.wordWrap);

    })

    this.httpClient.get('/assets/example-code.c', { responseType: 'text' }).subscribe(code => {
      this.inputTextCtrl.setValue(code);
    });

    this.modeForm.valueChanges.subscribe(({ wordWrap }) => {
      if (typeof this.inputTextCtrl.value === 'string') {
        this.displayText(this.inputTextCtrl.value);
      }
    })
  }

  handleClick(event: Event, element: HTMLElement): void {
    const x = (event as MouseEvent).offsetX;
    const y = (event as MouseEvent).offsetY;
    console.log({ x, y });
  }
}
