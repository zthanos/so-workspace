/**
 * Type declarations for markdown-it plugins without official types
 */

declare module 'markdown-it-table-of-contents' {
  import MarkdownIt from 'markdown-it';
  
  interface TOCOptions {
    includeLevel?: number[];
    containerClass?: string;
    slugify?: (str: string) => string;
    markerPattern?: RegExp;
    listType?: 'ul' | 'ol';
    format?: (content: string) => string;
    containerHeaderHtml?: string;
    containerFooterHtml?: string;
  }
  
  function markdownItTOC(md: MarkdownIt, options?: TOCOptions): void;
  
  export = markdownItTOC;
}

declare module 'markdown-it-attrs' {
  import MarkdownIt from 'markdown-it';
  
  interface AttrsOptions {
    leftDelimiter?: string;
    rightDelimiter?: string;
    allowedAttributes?: string[];
  }
  
  function markdownItAttrs(md: MarkdownIt, options?: AttrsOptions): void;
  
  export = markdownItAttrs;
}
