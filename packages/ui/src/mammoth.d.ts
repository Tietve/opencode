declare module "mammoth/mammoth.browser.js" {
  export interface ConvertResult {
    value: string
    messages: Array<{ type: string; message: string }>
  }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertResult>
  const _default: { convertToHtml: typeof convertToHtml }
  export default _default
}
