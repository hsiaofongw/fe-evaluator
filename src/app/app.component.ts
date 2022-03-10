import {
  Component,
  Directive,
  ElementRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { from, interval, of } from 'rxjs';
import { delay, delayWhen, sample } from 'rxjs/operators';

type CharObject = {
  content: string;
  dimension: TextMetrics;
  x: number;
  y: number;
  minY: number;
  maxY: number;
  boxDescent: number;
  boxAscent: number;
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
  firstLinePaddingTop = 10;

  @ViewChild('pseudoTerminalRef', { read: ElementRef })
  pseudoTerminalRef?: ElementRef<HTMLDivElement>;

  @ViewChild('backgroundCanvasRef', { read: ElementRef })
  backgroundCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('textCanvasRef', { read: ElementRef })
  textCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('cursorRef', { read: ElementRef })
  cursorRef?: ElementRef<HTMLCanvasElement>;

  private displayText(content: string): void {
    if (this.textCanvasRef) {
      const textCanvasElement = this.textCanvasRef.nativeElement;
      const textContext = textCanvasElement.getContext('2d');
      if (textContext) {
        textContext.fillStyle = this.textColor;
        textContext.font = `${this.defaultFontSize * this.scaleRatio}px ${
          this.defaultFontFamily
        }`;

        const charObjs: CharObject[] = [];
        for (const char of content) {
          const metric = textContext.measureText(char);
          const charObj = {
            content: char,
            dimension: metric,
            x: 0,
            y: 0,
            boxDescent: (metric as any).fontBoundingBoxDescent,
            boxAscent: (metric as any).fontBoundingBoxAscent,
            minY: 0,
            maxY: 0,
          };

          charObj.minY = charObj.y - charObj.boxAscent;
          charObj.maxY = charObj.y + charObj.boxDescent;

          charObjs.push(charObj);
        }

        // 文字上下平移
        const topEdge = this.firstLinePaddingTop;
        for (const char of charObjs) {
          const disp = topEdge - char.minY;
          char.minY = char.minY + disp;
          char.y = char.y + disp;
          char.maxY = char.maxY + disp;
        }


        // 计算 x
        // 第一个加上左填充
        if (charObjs.length) {
          charObjs[0].x = this.linePaddingLeft;
        }
        for (let i = 1; i < charObjs.length; i++) {
          const prevChar = charObjs[i - 1];
          const char = charObjs[i];
          char.x = prevChar.x + Math.ceil(prevChar.dimension.width);
        }

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
    this.displayText('Hello, world');

    // if (this.canvasRef) {
    //   const canvas = this.canvasRef.nativeElement;
    //   const context = canvas.getContext('2d');
    //   if (context) {
    //     context.fillStyle = this.cursorColor;
    //     context.font = '20px serif';
    //     context.globalCompositeOperation = 'copy';

    //     const ratio = window.devicePixelRatio || 1;
    //     console.log({ ratio });
    //     context.scale(ratio, ratio);
    //     const basepoint: [number, number] = [40, 20];
    //     const content = '你好，世界';
    //     let i = 0;

    //     const s = interval(1000).subscribe(() => {
    //       context.fillText(content[i], basepoint[0], basepoint[1]);
    //       i = i + 1;
    //       if (i >= content.length) {
    //         s.unsubscribe();
    //       }
    //     });

    //     const spaceDim = context.measureText(content[0]);
    //     const minX = Math.floor(basepoint[0] + (spaceDim as any).actualBoundingBoxLeft);
    //     const maxX = Math.ceil(basepoint[0] + (spaceDim as any).actualBoundingBoxRight);
    //     const minY = Math.floor(basepoint[1] - (spaceDim as any).fontBoundingBoxAscent);
    //     const maxY = Math.ceil(basepoint[1] + (spaceDim as any).fontBoundingBoxDescent);

    //     // let show = false;
    //     // interval(1000).subscribe(() => {
    //     //   if (show) {
    //     //     context.clearRect(minX, minY, maxX - minX, maxY - minY);
    //     //     context.fillText(content, basepoint[0], basepoint[1]);
    //     //     show = false;
    //     //   } else {
    //     //     context.fillRect(minX, minY, maxX - minX, maxY - minY);
    //     //     show = true;
    //     //   }
    //     // });
    //   }
    // }
  }
}
