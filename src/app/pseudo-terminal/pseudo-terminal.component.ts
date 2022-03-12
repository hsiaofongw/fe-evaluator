import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { fromEvent, Subject, Subscription } from 'rxjs';
import {
  LineFeed,
  CharObject,
  CharGeometry,
  CharEdge,
  CharGroupType,
  TaggedChar,
} from '../interfaces';

@Component({
  selector: 'app-pseudo-terminal',
  templateUrl: './pseudo-terminal.component.html',
  styleUrls: ['./pseudo-terminal.component.scss'],
})
export class PseudoTerminalComponent {
  defaultFontSize = 14;
  defaultFontFamily = 'Monaco';
  defaultLineFeed: LineFeed = 'LF';
  defaultWordWrapOption = true;

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
  paddingLeft = 10;
  paddingTop = 10;
  paddingRight = 10;
  wordWrap = false;
  originWidth = 0;
  originHeight = 0;
  scaledWidth = 0;
  scaledHeight = 0;
  lastPrintCharObjects: CharObject[] = [];
  currentHighlightCharIdx?: number;
  inputTextCtrl = new FormControl(null);
  keyboardSubscription?: Subscription;
  keyboardEvent$ = new Subject<KeyboardEvent>();

  private displayContent: Record<CharGroupType, string> = {
    printed: '',
    prompt: '',
    inputing: '',
    displaying: '',
  };

  @ViewChild('pseudoTerminalRef', { read: ElementRef })
  pseudoTerminalRef?: ElementRef<HTMLDivElement>;

  @ViewChild('backgroundCanvasRef', { read: ElementRef })
  backgroundCanvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('textCanvasRef', { read: ElementRef })
  textCanvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('cursorRef', { read: ElementRef })
  cursorRef?: ElementRef<HTMLCanvasElement>;

  constructor(private httpClient: HttpClient) {}

  /** 将文字拆分成逻辑行 */
  private splitLineToLines(line: string): string[] {
    if (line.length === 0) {
      return [];
    }

    return line.split(this.getLineFeedContent());
  }

  private getLineFeedContent(): string {
    const lfMap: Record<LineFeed, string> = {
      CR: '\r',
      CRLF: '\r\n',
      LF: '\n',
    };

    return lfMap[this.defaultLineFeed];
  }

  /** 将文本内容拆分成一个 CharObject 数组 */
  private splitCharString(
    content: TaggedChar[],
    textContext: CanvasRenderingContext2D,
  ): CharObject[] {
    const charObjs: CharObject[] = [];
    let windowPtr = 0;
    const lineFeed = this.getLineFeedContent();
    let windowSize = lineFeed.length;
    let lineNumber = 0;
    let lineBuffer = '';
    while (windowPtr <= content.length-1) {
      const window = content.slice(windowPtr, windowPtr + windowSize);
      const windowContent = window.map(x => x.content).join('');
      const windowHead = window[0];
      const char = windowHead.content;
      const groupName = windowHead.groupName;
      const metric = textContext.measureText(char);
      const charObj: CharObject = {
        content: char,
        dimension: metric,
        x: 0,
        y: 0,
        lineNumber: lineNumber,
        displayLineNumber: lineNumber,
        offsetToFileStart: windowPtr,
        offsetToLineStart: lineBuffer.length,
        geometry: this.getGeometry(metric),
        groupName: groupName,
      };

      if (windowContent === lineFeed) {
        charObj.content = lineFeed;
        lineNumber = lineNumber + 1;
        lineBuffer = '';
      }

      charObjs.push(charObj);
      windowPtr = windowPtr + charObj.content.length;
    }

    return charObjs;
  }

  private getGeometry(metric: TextMetrics): CharGeometry {
    return {
      logicalWidth: (metric as any).width,
      fontBoundingBoxAscent: (metric as any).fontBoundingBoxAscent,
      fontBoundingBoxDescent: (metric as any).fontBoundingBoxDescent,
      actualBoundingBoxLeft: (metric as any).actualBoundingBoxLeft,
      actualBoundingBoxRight: (metric as any).actualBoundingBoxRight,
    };
  }

  /** 计算文本内容中每个文字的几何信息  */
  private calculateCharObjectGeometry(charObjs: CharObject[]): void {
    if (charObjs.length === 0) {
      return;
    }

    // 指向第一个文字
    const firtChar = charObjs[0];

    // 先将它的 x 设为 0
    firtChar.x = 0;

    // 然后计算它的最左边界
    const minX = firtChar.x + firtChar.geometry.actualBoundingBoxLeft;

    // 然后计算需要向右平移的距离
    const xDisp = this.paddingLeft - minX;

    // 然后向右平移
    firtChar.x = firtChar.x + xDisp;

    // 第一个文字的 x 计算完成

    // 计算第一个文字的 y
    // 也是先将第一个文字的 y 置为 0
    firtChar.y = 0;

    // 然后计算这个文字的最上边距值
    const minY = firtChar.y - firtChar.geometry.fontBoundingBoxAscent;

    // 然后计算所需向下平移的距离
    const yDisp = this.paddingTop - minY;

    // 然后执行平移操作
    firtChar.y = firtChar.y + yDisp;

    // 计算每一个 char 的 x 和 y 并且处理 word-wrap 和换行的情形
    let prevChar = firtChar;
    for (let i = 1; i < charObjs.length; i++) {
      const char = charObjs[i];

      // 默认情形
      char.x =
        prevChar.x +
        prevChar.geometry.actualBoundingBoxRight +
        Math.abs(char.geometry.actualBoundingBoxLeft);

      if (
        prevChar.geometry.actualBoundingBoxRight ===
        prevChar.geometry.actualBoundingBoxLeft
      ) {
        char.x = prevChar.x + prevChar.geometry.logicalWidth;
      }

      char.y = prevChar.y;

      if (
        prevChar.lineNumber < char.lineNumber ||
        (this.wordWrap &&
          char.x + char.dimension.width > this.scaledWidth - this.paddingLeft)
      ) {
        // 手动换行情形处理
        char.x = firtChar.x;
        char.y =
          prevChar.y +
          prevChar.geometry.fontBoundingBoxDescent +
          char.geometry.fontBoundingBoxAscent;
      }

      prevChar = char;
    }
  }

  /** 在 canvas 上显示一段文字 */
  private updateCanvasDisplay(): void {
    
    if (this.textCanvasRef) {
      const textCanvasElement = this.textCanvasRef.nativeElement;
      const textContext = textCanvasElement.getContext('2d');
      if (textContext) {
        textContext.fillStyle = this.textColor;
        const scaledFontSize = this.defaultFontSize * this.scaleRatio;
        textContext.font = `${scaledFontSize}px ${this.defaultFontFamily}`;

        this.displayCharObjects(
          this.textContentToCharObjects(textContext),
          textContext
        );
      }
    }
  }

  /** 将一段文字转换成带几何信息的 CharObject[] */
  private textContentToCharObjects(
    context: CanvasRenderingContext2D
  ): CharObject[] {
    const taggedChars: TaggedChar[] = [];
    for (const s in this.displayContent) {
      const groupName = s as CharGroupType;
      const content = this.displayContent[groupName];
      for (const char of content) {
        taggedChars.push({
          content: char,
          groupName: groupName
        });
      }
    }

    const charObjs = this.splitCharString(taggedChars, context);

    this.calculateCharObjectGeometry(charObjs);

    console.log({charObjs});

    return charObjs;
  }

  /** 将 CharObject[] 在 canvas 上渲染出来 */
  private displayCharObjects(
    charObjs: CharObject[],
    textContext: CanvasRenderingContext2D
  ): void {
    textContext.clearRect(0, 0, this.scaledWidth, this.scaledHeight);
    for (const char of charObjs) {
      textContext.fillText(char.content, char.x, char.y);
    }
    this.lastPrintCharObjects = charObjs;
  }

  /** 在背景 canvas 上展示背景颜色 */
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

  /** 初始化页面上的 canvas 元素 */
  private initializeCanvasElements(): void {
    if (this.pseudoTerminalRef) {
      // 三个重叠 canvas 元素的直接容器
      const div = this.pseudoTerminalRef.nativeElement;

      // 三个重叠 canvas 元素的直接容器的 box
      const box = div.getBoundingClientRect();

      // 获取 devicePixelRatio
      const ratio = window.devicePixelRatio || 1;
      this.scaleRatio = ratio;

      // 获取 DOM 容器的 width, height
      const originWidth = box.width;
      const originHeight = box.height;

      // 乘以 scaleFactor
      const scaledWidth = originWidth * ratio;
      const scaledHeight = originHeight * ratio;

      // 获取 scaledHeight, scaledWidth, 记录 originHeight, originWidth
      this.scaledHeight = scaledHeight;
      this.scaledWidth = scaledWidth;
      this.originWidth = originWidth;
      this.originHeight = originHeight;

      // 设置每个 canvas 元素的宽和高
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
  }

  /** 视图初始化之后 */
  ngAfterViewInit(): void {
    // 初始化 canvas
    this.initializeCanvasElements();

    // 在背景图层画背景颜色
    this.paintBackground();

    this.keyboardEvent$.subscribe(event => {
      // console.log(event);
      const key = event.key;
      const isDisplayable = (key: string) => /^[\u0009-\u000D\u0020-\u007E]$/.test(key);
      console.log({ key: key, isDisplayable: isDisplayable(key) });
    });
  }

  /** 响应鼠标点击事件 */
  handleClick(event: Event): void {
    const x = (event as MouseEvent).offsetX;
    const y = (event as MouseEvent).offsetY;
    this.currentHighlightCharIdx = undefined;
    const charQuery = this.findCharObj(
      x * this.scaleRatio,
      y * this.scaleRatio,
      this.lastPrintCharObjects
    );
    this.clearCursor();
    if (charQuery) {
      this.strokeCharCursor(charQuery.char);
      this.currentHighlightCharIdx = charQuery.idx;
    }
  }

  /** 在指定的 CharObj 处绘制 cursor */
  private strokeCharCursor(charObj: CharObject): void {
    const context = this.getCursorContext();
    if (context) {
      const edge = this.getCharEdge(charObj);
      context.globalCompositeOperation = 'copy';
      context.fillStyle = this.cursorColor;
      context.beginPath();
      context.moveTo(edge.minX, edge.maxY);
      context.lineTo(edge.maxX, edge.maxY);
      context.lineTo(edge.maxX, edge.minY);
      context.lineTo(edge.minX, edge.minY);
      context.lineTo(edge.minX, edge.maxY);
      context.closePath();
      context.fill();
    }
  }

  /** 清除 cursor 图层的内容 */
  private clearCursor(): void {
    const context = this.getCursorContext();
    if (context) {
      context.clearRect(0, 0, this.scaledWidth, this.scaledHeight);
    }
  }

  /** 获取 cursor 图层 canvas 元素的 Canvas 2D Context */
  private getCursorContext(): CanvasRenderingContext2D | undefined {
    if (this.cursorRef) {
      const ctx = this.cursorRef.nativeElement.getContext('2d');
      if (ctx) {
        return ctx;
      }
    }

    return undefined;
  }

  /** 给定一组坐标 (x, y)，寻找距离此坐标最近的 CharObj */
  private findCharObj(
    x: number,
    y: number,
    chars: CharObject[]
  ): { idx: number; char: CharObject } | undefined {
    const findByYRange: { idx: number; char: CharObject }[] = [];
    for (let idx = 0; idx < chars.length; idx++) {
      const char = chars[idx];
      const charEdge = this.getCharEdge(char);

      if (y >= charEdge.minY && y <= charEdge.maxY) {
        findByYRange.push({ idx, char });
      }
    }

    if (findByYRange.length === 0) {
      return undefined;
    }

    for (let i = 0; i < findByYRange.length; i++) {
      const char = findByYRange[i].char;
      const idx = findByYRange[i].idx;
      const charEdge = this.getCharEdge(char);

      if (x >= charEdge.minX && x <= charEdge.maxX) {
        return { idx, char };
      }
    }

    findByYRange.sort((a, b) => b.char.x - a.char.x);
    return findByYRange[0];
  }

  /** 获取一个 CharEdge 的矩形域 */
  private getCharEdge(charObj: CharObject): CharEdge {
    // const minX = charObj.x + (charObj.dimension as any).actualBoundingBoxLeft;
    const minX = charObj.x;
    const maxX = minX + (charObj.dimension as any).width;
    const minY = charObj.y - (charObj.dimension as any).fontBoundingBoxAscent;
    const maxY = charObj.y + (charObj.dimension as any).fontBoundingBoxDescent;

    return {
      minX,
      maxX,
      maxY,
      minY,
      height: maxY - minY,
      width: (charObj.dimension as any).width,
    };
  }

  public handleBlur() {
    this.keyboardSubscription?.unsubscribe();
    this.clearCursor();
  }

  public handleFocus() {
    this.keyboardSubscription = fromEvent(window, 'keydown').subscribe(
      (event) => {
        const keyboardEvent = event as KeyboardEvent;
        this.keyboardEvent$.next(keyboardEvent);
      }
    );
  }

  public prompt(content: string): void {
    let lastPrinted = this.displayContent.printed +
    this.displayContent.prompt +
    this.displayContent.inputing +
    this.displayContent.displaying;

    if (lastPrinted.length > 0) {
      lastPrinted = lastPrinted + '\n';
    }

    this.displayContent.printed = lastPrinted;
    
    this.displayContent.prompt = content;
    this.updateCanvasDisplay();
  }
}
