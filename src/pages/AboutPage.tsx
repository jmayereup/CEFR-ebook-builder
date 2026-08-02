import {
  BookMarked,
  BookOpen,
  Brain,
  Check,
  Compass,
  Copy,
  Download,
  Globe,
  HelpCircle,
  Languages,
  Layers,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';

interface AboutPageProps {
  setActiveTab: (
    tab: 'browse' | 'bookshelf' | 'create' | 'practice' | 'admin' | 'about',
  ) => void;
}

export default function AboutPage({ setActiveTab }: AboutPageProps) {
  const [copied, setCopied] = useState(false);
  const supportEmail = 'admin@teacherjake.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2 px-1">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-tj-bg-card border border-tj-border-main rounded-3xl p-6 sm:p-10 shadow-sm">
        <div className="absolute -top-12 -right-12 w-60 h-60 bg-tj-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tj-primary/10 border border-tj-primary/20 text-tj-primary text-xs font-bold tracking-wide">
            <Sparkles className="w-4 h-4" />
            <span>Graded eBook Builder & Comprehensible Input Platform</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-tj-text-main tracking-tight font-sans">
            About CEFR Stories
          </h1>

          <p className="text-sm sm:text-base text-tj-text-muted leading-relaxed max-w-2xl font-sans">
            Empowering language acquisition through interest-driven stories that can be read on any ebook reader.
          </p>
        </div>
      </div>

      {/* The Anecdote / Origin Story */}
      <div className="bg-tj-bg-card border border-tj-border-main rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-tj-primary">
          <div className="p-2.5 bg-tj-primary/10 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-tj-text-main font-sans">
              How CEFR Stories Started
            </h2>
            <p className="text-xs text-tj-text-muted">
              A personal journey in language learning
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-tj-text-main/90 leading-relaxed font-sans border-l-2 border-tj-primary/40 pl-4 py-1 my-2">
          <p>
            CEFR Stories was born out of a real personal challenge. While
            learning Thai and striving to reach reading fluency, I wanted to read
            engaging, level-appropriate short stories on my Kindle. However, finding accessible, graded Thai reading material formatted for
            e-readers proved nearly impossible.
          </p>
          <p>
          </p>
          <p>
            Frustrated by the lack of graded readers for non-Western languages, I
            built CEFR Stories: an AI-driven eBook builder that crafts custom,
            multi-chapter stories guided by CEFR difficulty levels. It offers
            helpful difficulty scaffolding, click-to-listen pronunciation help, integrated glossaries, and instant EPUB exports optimized for Kindle and other e-readers.
          </p>
        </div>
      </div>

      {/* Language Acquisition Science & Krashen's Method */}
      <div className="bg-tj-bg-card border border-tj-border-main rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3 text-tj-primary">
          <div className="p-2.5 bg-tj-primary/10 rounded-2xl">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-tj-text-main font-sans">
              Applying Krashen’s Comprehensible Input Theory
            </h2>
            <p className="text-xs text-tj-text-muted">
              The science behind natural language acquisition
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs sm:text-sm text-tj-text-muted leading-relaxed font-sans">
          <p>
            Linguist Stephen Krashen’s famous{' '}
            <strong className="text-tj-text-main">
              Input Hypothesis (i + 1)
            </strong>{' '}
            states that we acquire language naturally when we read or hear messages
            we understand with just a slight degree of challenge.
            Rote grammar drills rarely build real fluency; compelling, readable text
            does.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 bg-tj-bg-recessed border border-tj-border-main/70 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-tj-text-main flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tj-primary" />
              1. Scaffolding ($i+1$)
            </h4>
            <p className="text-[11px] text-tj-text-muted leading-relaxed">
              Stories match your approximate CEFR level, introducing new vocabulary
              in understandable contexts without overwhelming you.
            </p>
          </div>

          <div className="p-4 bg-tj-bg-recessed border border-tj-border-main/70 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-tj-text-main flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              2. Topics You Love
            </h4>
            <p className="text-[11px] text-tj-text-muted leading-relaxed">
              Krashen highlighted that input must be <em>compelling</em>. Generate
              stories on topics you genuinely enjoy—lowering anxiety and boosting retention.
            </p>
          </div>

          <div className="p-4 bg-tj-bg-recessed border border-tj-border-main/70 rounded-2xl space-y-2">
            <h4 className="text-xs font-bold text-tj-text-main flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              3. Low Affective Filter
            </h4>
            <p className="text-[11px] text-tj-text-muted leading-relaxed">
              Instant word lookups and line translations eliminate reading friction,
              keeping you in a relaxed state optimized for acquisition.
            </p>
          </div>
        </div>
      </div>

      {/* Core Platform Purpose & Features */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-tj-text-main font-sans px-1">
          What CEFR Stories Offers
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-sm space-y-2">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-tj-text-main">
              Create Custom Stories on Topics You Are Interested In
            </h4>
            <p className="text-xs text-tj-text-muted leading-relaxed">
              Generate full, multi-chapter stories on any subject you choose—from sci-fi mysteries and culinary journeys to local culture and fantasy adventures.
            </p>
          </div>

          <div className="p-5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-sm space-y-2">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-tj-text-main">
              Vocab Builder & Spaced Repetition (SRS)
            </h4>
            <p className="text-xs text-tj-text-muted leading-relaxed">
              Tap any unfamiliar word while reading to save it to your deck, then practice and master your terms with spaced repetition flashcard activities. Word lists can be exported to Anki and other platforms.
            </p>
          </div>

          <div className="p-5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-sm space-y-2">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Languages className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-tj-text-main">
              20+ Supported Languages
            </h4>
            <p className="text-xs text-tj-text-muted leading-relaxed">
              Read stories in Thai, Spanish, French, Japanese, German, and many more with native script support, audio playback, and instant translations. Email me if you would like to see another language supported.
            </p>
          </div>

          <div className="p-5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-sm space-y-2">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <BookMarked className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-tj-text-main">
              CEFR Difficulty Scaffolding
            </h4>
            <p className="text-xs text-tj-text-muted leading-relaxed">
              CEFR levels (A1 to C2) serve as rough guidelines embedded in prompts. While leveling can be less precise for non-European languages, they still provide helpful difficulty scaffolding.
            </p>
          </div>

          <div className="p-5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-sm space-y-2 sm:col-span-2">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <Download className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-tj-text-main">
              Kindle & eReader EPUB Export
            </h4>
            <p className="text-xs text-tj-text-muted leading-relaxed">
              Download clean, beautifully formatted EPUB files ready to transfer directly to your Kindle, Kobo, or mobile e-reader for offline reading anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Support & Contact Section */}
      <div className="bg-gradient-to-br from-tj-primary/10 via-tj-bg-card to-tj-bg-card border border-tj-primary/30 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-tj-primary text-tj-bg-main rounded-2xl shadow-sm">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-tj-text-main font-sans">
              Contact & Support
            </h2>
            <p className="text-xs text-tj-text-muted">
              We're here to help you get the most out of your language journey
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-tj-text-muted leading-relaxed font-sans">
          Have feedback, feature requests, language suggestions, or need help with your account? Reach out to support directly at the email below:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <div className="flex-1 flex items-center justify-between px-4 py-3 bg-tj-bg-recessed border border-tj-border-main rounded-2xl text-xs sm:text-sm font-mono font-bold text-tj-text-main">
            <span>{supportEmail}</span>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="p-1.5 hover:bg-tj-border-main/40 text-tj-text-muted hover:text-tj-text-main rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs"
              title="Copy Email Address"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500 font-sans font-bold">
                    Copied!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="font-sans">Copy</span>
                </>
              )}
            </button>
          </div>

          <a
            href={`mailto:${supportEmail}`}
            className="px-6 py-3 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs sm:text-sm rounded-2xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2 select-none"
          >
            <Mail className="w-4 h-4" />
            <span>Send Email</span>
          </a>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-tj-border-main/50 text-xs text-tj-text-muted">
        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          className="text-tj-primary hover:underline font-semibold cursor-pointer"
        >
          ← Back to Library
        </button>

        <div className="flex items-center gap-4">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-tj-primary transition-colors"
          >
            Privacy Notice
          </a>
          <span>•</span>
          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-tj-primary transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}
