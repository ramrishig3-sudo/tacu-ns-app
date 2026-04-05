import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="text-4xl font-extrabold mt-8 mb-4 text-white">{children}</h1>,
    h2: ({ children }) => <h2 className="text-3xl font-bold mt-8 mb-4 text-white">{children}</h2>,
    h3: ({ children }) => <h3 className="text-2xl font-bold mt-6 mb-3 text-white">{children}</h3>,
    p: ({ children }) => <p className="text-neutral-300 leading-relaxed mb-6">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-6 mb-6 space-y-2 text-neutral-300">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-6 mb-6 space-y-2 text-neutral-300">{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    code: ({ children }) => <code className="bg-neutral-800 text-teal-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
    pre: ({ children }) => <pre className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 overflow-x-auto mb-6 text-sm">{children}</pre>,
    a: ({ href, children }) => <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-4">{children}</a>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-teal-500 pl-4 py-1 bg-teal-500/10 text-neutral-200 rounded-r-lg mb-6 italic">{children}</blockquote>,
    ...components,
  }
}
