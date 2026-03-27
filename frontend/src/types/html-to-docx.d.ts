declare module "html-to-docx" {
  function htmlToDocx(
    htmlString: string,
    headerHTMLString?: string | null,
    options?: {
      title?: string;
      margins?: { top?: number; bottom?: number; left?: number; right?: number };
      fontSize?: number;
      lang?: string;
    }
  ): Promise<Blob | Buffer>;
  export default htmlToDocx;
}
