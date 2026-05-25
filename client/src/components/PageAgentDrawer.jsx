import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, PanelRightClose, PanelRightOpen, Send, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { analysisAPI } from '../services/apiClient'

const PageAgentDrawer = ({
  surface = 'workflow',
  title = 'Page AI',
  subtitle = 'Ask anything.',
  open = false,
  onToggle,
  context = {},
  provider = 'lmstudio',
  apiKey = null,
  baseUrl = null,
  model = null,
}) => {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const markdownComponents = {
    h1: ({ children }) => <h1 className="text-base font-extrabold tracking-tight text-slate-50 mt-0 mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-sm font-bold tracking-tight text-slate-50 mt-4 mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-semibold tracking-tight text-slate-50 mt-3 mb-1.5">{children}</h3>,
    p: ({ children }) => <p className="my-2 leading-6 text-slate-200">{children}</p>,
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 text-slate-200">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 text-slate-200">{children}</ol>,
    li: ({ children }) => <li className="leading-6">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-slate-50">{children}</strong>,
    em: ({ children }) => <em className="italic text-slate-100">{children}</em>,
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l border-cyan-300/30 pl-3 italic text-slate-300">{children}</blockquote>
    ),
    code: ({ inline, children }) =>
      inline ? (
        <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[0.92em] text-cyan-100">{children}</code>
      ) : (
        <code className="block overflow-x-auto rounded-xl bg-black/30 p-3 font-mono text-[13px] leading-6 text-slate-200">
          {children}
        </code>
      ),
    a: ({ children, href }) => (
      <a href={href} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2">
        {children}
      </a>
    ),
  }

  const askCopilot = async (customPrompt) => {
    const nextPrompt = (customPrompt || prompt).trim()
    if (!nextPrompt || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await analysisAPI.generateCopilotBrief({
        prompt: nextPrompt,
        surface,
        provider,
        api_key: apiKey,
        base_url: baseUrl,
        model,
        page_context: context,
      })
      setResult(data)
      setPrompt('')
    } catch (err) {
      console.error(err)
      setResult(null)
      setError(typeof err?.message === 'string' ? err.message : 'AI request failed')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      askCopilot()
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed right-3 top-3 bottom-3 z-[180] w-[min(92vw,384px)] rounded-3xl border border-white/10 bg-[#07111f]/92 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.4)] overflow-hidden"
        >
          <div className="h-full flex flex-col">
            <div className="px-4 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 text-[10px] font-bold uppercase tracking-[0.18em] mb-3">
                  <Sparkles size={12} /> {title}
                </div>
                <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-5">{subtitle}</p>
              </div>
              <button
                onClick={onToggle}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-200"
                aria-label="Collapse page AI"
              >
                <PanelRightClose size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2">
              {result && (
                <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4 mt-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200 mb-2">Answer</div>
                  <div className="text-sm text-slate-200 leading-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {result.answer}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100 mt-3">
                  {error}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="rounded-[22px] bg-[#0e1725] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-10 flex items-center px-2 rounded-xl bg-transparent text-slate-300">
                    <input
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={onKeyDown}
                      className="w-full bg-transparent outline-none placeholder:text-slate-500 text-sm"
                    />
                  </div>

                  <button
                    onClick={() => askCopilot()}
                    disabled={loading}
                    className="h-10 px-5 rounded-xl bg-cyan-400 text-slate-950 font-extrabold inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>
      ) : (
        <motion.button
          initial={{ x: 8, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          onClick={onToggle}
          className="fixed right-3 top-1/2 -translate-y-1/2 z-[180] h-14 w-14 rounded-2xl border border-white/10 bg-[#07111f]/92 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.35)] flex items-center justify-center text-cyan-200 hover:text-cyan-100 hover:bg-white/10"
          aria-label="Open page AI"
        >
          <PanelRightOpen size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export default PageAgentDrawer
