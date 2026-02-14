
declare module "ascii-table" {
  export default class AsciiTable {
    constructor(title?: string);
    setHeading(...heading: string[]): this;
    addRow(...row: any[]): this;
    addRows(rows: any[][]): this;
    toString(): string;
  }
}