import { WifiOff } from 'lucide-react';
import StoryConfigForm from '../components/StoryConfigForm';
import type { GenerationLimitData } from '../services/db';

interface CreateStoryConfig {
  language: string;
  cefrLevel: string;
  genre: string;
  totalChapters: number;
  promptNotes: string;
  chapterLength: number;
  storyTitle?: string;
  outline?: string;
  description?: string;
  model?: string;
  thinkingLevel?: string;
  thinkingBudget?: number;
  temperature?: number;
  translationLanguage?: string;
  isPublic?: boolean;
  skipChapterGeneration?: boolean;
}

interface CreatePageProps {
  isOnline: boolean;
  handleInitiateStory: (config: CreateStoryConfig) => void;
  isGenerating: boolean;
  currentUser: { uid: string; email: string | null } | null;
  isPaid: boolean;
  generationLimitData: GenerationLimitData;
  onLogin?: () => void;
}

export default function CreatePage({
  isOnline,
  handleInitiateStory,
  isGenerating,
  currentUser,
  isPaid,
  generationLimitData,
  onLogin,
}: CreatePageProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!isOnline ? (
        <div className="bg-tj-bg-card p-12 rounded-lg border border-tj-border-main text-center space-y-4 shadow-none">
          <WifiOff
            className="w-12 h-12 text-tj-text-muted/50 mx-auto"
            strokeWidth={1.5}
          />
          <div>
            <h4 className="text-tj-text-main font-serif font-extrabold text-base">
              Generation Offline
            </h4>
            <p className="text-xs text-tj-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
              Creating new custom stories requires an active internet connection
              to contact the AI model generators. Please connect to the internet
              to start drafting.
            </p>
          </div>
        </div>
      ) : (
        <StoryConfigForm
          onSubmit={handleInitiateStory}
          isLoading={isGenerating}
          isAdmin={currentUser?.email === 'jmayereup@gmail.com'}
          isPaid={isPaid}
          freeModelCount={generationLimitData.freeModelCount ?? 0}
          monthlyCreditsUsed={generationLimitData.monthlyCreditsUsed ?? 0}
          onLogin={onLogin}
        />
      )}
    </div>
  );
}
