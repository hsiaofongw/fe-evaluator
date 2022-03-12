/**
 * 换行方式
 *
 * 'CR': 用一个 0x0D 字符 '\r' 表示换行
 *
 * 'CRLF': 用 0x0D 字符 '\r', 而后紧接着一个 0x0A 字符 '\n' 表示换行
 *
 * 'LF': 用一个 0x0A 字符 '\n' 表示换行
 */
export type LineFeed = 'CR' | 'CRLF' | 'LF';

export type CharGeometry = {
  logicalWidth: number;
  fontBoundingBoxDescent: number;
  fontBoundingBoxAscent: number;
  actualBoundingBoxRight: number;
  actualBoundingBoxLeft: number;
};

export type CharObjectBasic = {
  /** 文字在 Canvas 中的度量信息 */
  dimension: TextMetrics;

  /** 反复使用的几何数据 */
  geometry: CharGeometry;

  /** 文字的基点的 x */
  x: number;

  /** 文字的基点的 y */
  y: number;

  /** 行号，第一行是 0 */
  lineNumber: number;

  /** 实际显示行号，当 word-wrap 处于开启时，displayLineNumber >= lineNumber 恒成立 */
  displayLineNumber: number;

  /** 在原字符串中的位置 */
  offsetToFileStart: number;

  /** 在所在行中的位置 */
  offsetToLineStart: number;
};

export type CharGroupType = 'printed' | 'prompt' | 'inputing' | 'displaying';

export type TaggedChar = {
  /** 字符的内容 */
  content: string;

  /** 组名称 */
  groupName: CharGroupType;
};

export type CharObject = CharObjectBasic & TaggedChar;

export type CharEdge = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  height: number;
  width: number;
};

