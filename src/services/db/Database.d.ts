/**
 * This file was @generated using typed-pocketbase
 */

// https://pocketbase.io/docs/collections/#base-collection
export interface BaseCollectionResponse {
  /**
   * 15 characters string to store as record ID.
   */
  id: string;
  /**
   * Date string representation for the creation date.
   */
  created: string;
  /**
   * Date string representation for the creation date.
   */
  updated: string;
  /**
   * The collection id.
   */
  collectionId: string;
  /**
   * The collection name.
   */
  collectionName: string;
}

// https://pocketbase.io/docs/api-records/#create-record
export interface BaseCollectionCreate {
  /**
   * 15 characters string to store as record ID.
   * If not set, it will be auto generated.
   */
  id?: string;
}

// https://pocketbase.io/docs/api-records/#update-record
export type BaseCollectionUpdate = {};

// https://pocketbase.io/docs/collections/#auth-collection
export interface AuthCollectionResponse extends BaseCollectionResponse {
  /**
   * The username of the auth record.
   */
  username: string;
  /**
   * Auth record email address.
   */
  email: string;
  /**
   * Whether to show/hide the auth record email when fetching the record data.
   */
  emailVisibility: boolean;
  /**
   * Indicates whether the auth record is verified or not.
   */
  verified: boolean;
}

// https://pocketbase.io/docs/api-records/#create-record
export interface AuthCollectionCreate extends BaseCollectionCreate {
  /**
   * The username of the auth record.
   * If not set, it will be auto generated.
   */
  username?: string;
  /**
   * Auth record email address.
   */
  email?: string;
  /**
   * Whether to show/hide the auth record email when fetching the record data.
   */
  emailVisibility?: boolean;
  /**
   * Auth record password.
   */
  password: string;
  /**
   * Auth record password confirmation.
   */
  passwordConfirm: string;
  /**
   * Indicates whether the auth record is verified or not.
   * This field can be set only by admins or auth records with "Manage" access.
   */
  verified?: boolean;
}

// https://pocketbase.io/docs/api-records/#update-record
export interface AuthCollectionUpdate {
  /**
   * The username of the auth record.
   */
  username?: string;
  /**
   * The auth record email address.
   * This field can be updated only by admins or auth records with "Manage" access.
   * Regular accounts can update their email by calling "Request email change".
   */
  email?: string;
  /**
   * Whether to show/hide the auth record email when fetching the record data.
   */
  emailVisibility?: boolean;
  /**
   * Old auth record password.
   * This field is required only when changing the record password. Admins and auth records with "Manage" access can skip this field.
   */
  oldPassword?: string;
  /**
   * New auth record password.
   */
  password?: string;
  /**
   * New auth record password confirmation.
   */
  passwordConfirm?: string;
  /**
   * Indicates whether the auth record is verified or not.
   * This field can be set only by admins or auth records with "Manage" access.
   */
  verified?: boolean;
}

// https://pocketbase.io/docs/collections/#view-collection
export interface ViewCollectionRecord {
  id: string;
}

// utilities

type MaybeArray<T> = T | T[];

// ===== users =====

export interface UsersResponse extends AuthCollectionResponse {
  collectionName: 'users';
  id: string;
  password: unknown;
  tokenKey: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  username: string;
  name: string;
  avatar: string;
  playlist: any;
  personalWordBank: any;
  isAdmin: boolean;
  wordsListenedTo: number;
  wordsTranslated: number;
  wordbanksCreated: number;
  lessonsViewed: number;
  beginnerLessons: any;
  conversationsPlayed: number;
  gamesPlayed: number;
  photoUrl: string;
  isPaid: boolean;
  savedVocab: any;
  lookupLimitData: string;
  generationLimitData: any;
  bookshelf: any;
  recentlyRead: any;
  streak: any;
  created: unknown;
  updated: unknown;
}

export interface UsersCreate extends AuthCollectionCreate {
  id: string;
  password: unknown;
  tokenKey: string;
  email?: string;
  emailVisibility?: boolean;
  verified?: boolean;
  username: string;
  name?: string;
  avatar?: File | null;
  playlist?: any;
  personalWordBank?: any;
  isAdmin?: boolean;
  wordsListenedTo?: number;
  wordsTranslated?: number;
  wordbanksCreated?: number;
  lessonsViewed?: number;
  beginnerLessons?: any;
  conversationsPlayed?: number;
  gamesPlayed?: number;
  photoUrl?: string | URL;
  isPaid?: boolean;
  savedVocab?: any;
  lookupLimitData?: string | URL;
  generationLimitData?: any;
  bookshelf?: any;
  recentlyRead?: any;
  streak?: any;
  created?: unknown;
  updated?: unknown;
}

export interface UsersUpdate extends AuthCollectionUpdate {
  id?: string;
  password?: unknown;
  tokenKey?: string;
  email?: string;
  emailVisibility?: boolean;
  verified?: boolean;
  username?: string;
  name?: string;
  avatar?: File | null;
  playlist?: any;
  personalWordBank?: any;
  isAdmin?: boolean;
  wordsListenedTo?: number;
  'wordsListenedTo+'?: number;
  'wordsListenedTo-'?: number;
  wordsTranslated?: number;
  'wordsTranslated+'?: number;
  'wordsTranslated-'?: number;
  wordbanksCreated?: number;
  'wordbanksCreated+'?: number;
  'wordbanksCreated-'?: number;
  lessonsViewed?: number;
  'lessonsViewed+'?: number;
  'lessonsViewed-'?: number;
  beginnerLessons?: any;
  conversationsPlayed?: number;
  'conversationsPlayed+'?: number;
  'conversationsPlayed-'?: number;
  gamesPlayed?: number;
  'gamesPlayed+'?: number;
  'gamesPlayed-'?: number;
  photoUrl?: string | URL;
  isPaid?: boolean;
  savedVocab?: any;
  lookupLimitData?: string | URL;
  generationLimitData?: any;
  bookshelf?: any;
  recentlyRead?: any;
  streak?: any;
  created?: unknown;
  updated?: unknown;
}

export interface UsersCollection {
  type: 'auth';
  collectionId: string;
  collectionName: 'users';
  response: UsersResponse;
  create: UsersCreate;
  update: UsersUpdate;
  relations: {
    'stories(creatorId)': StoriesCollection[];
  };
}

// ===== lessons =====

export interface LessonsResponse extends BaseCollectionResponse {
  collectionName: 'lessons';
  id: string;
  title: string;
  content: string;
  shareable: boolean;
  creatorId: string;
  language: '' | 'English' | 'Thai' | 'German' | 'French' | 'Spanish';
  imageUrl: string;
  audioUrl: string;
  videoUrl: string;
  tags: Array<
    | 'A1'
    | 'A2'
    | 'B1'
    | 'B2'
    | 'CONVERSATION'
    | 'STORY'
    | 'SCHOOL'
    | 'GRAMMAR'
    | 'NON-FICTION'
    | 'SCIENCE'
    | 'NEWS'
    | 'VIDEO'
    | 'OTHER'
  >;
  vocabulary: string;
  wordbank: any;
  imageFile: string;
  audioFile: string;
  created: unknown;
  updated: unknown;
}

export interface LessonsCreate extends BaseCollectionCreate {
  id: string;
  title?: string;
  content?: string;
  shareable?: boolean;
  creatorId?: string;
  language?: '' | 'English' | 'Thai' | 'German' | 'French' | 'Spanish';
  imageUrl?: string | URL;
  audioUrl?: string | URL;
  videoUrl?: string | URL;
  tags?: MaybeArray<
    | 'A1'
    | 'A2'
    | 'B1'
    | 'B2'
    | 'CONVERSATION'
    | 'STORY'
    | 'SCHOOL'
    | 'GRAMMAR'
    | 'NON-FICTION'
    | 'SCIENCE'
    | 'NEWS'
    | 'VIDEO'
    | 'OTHER'
  >;
  vocabulary?: string;
  wordbank?: any;
  imageFile?: File | null;
  audioFile?: File | null;
  created?: unknown;
  updated?: unknown;
}

export interface LessonsUpdate extends BaseCollectionUpdate {
  id?: string;
  title?: string;
  content?: string;
  shareable?: boolean;
  creatorId?: string;
  language?: '' | 'English' | 'Thai' | 'German' | 'French' | 'Spanish';
  imageUrl?: string | URL;
  audioUrl?: string | URL;
  videoUrl?: string | URL;
  tags?: MaybeArray<
    | 'A1'
    | 'A2'
    | 'B1'
    | 'B2'
    | 'CONVERSATION'
    | 'STORY'
    | 'SCHOOL'
    | 'GRAMMAR'
    | 'NON-FICTION'
    | 'SCIENCE'
    | 'NEWS'
    | 'VIDEO'
    | 'OTHER'
  >;
  'tags+'?: MaybeArray<
    | 'A1'
    | 'A2'
    | 'B1'
    | 'B2'
    | 'CONVERSATION'
    | 'STORY'
    | 'SCHOOL'
    | 'GRAMMAR'
    | 'NON-FICTION'
    | 'SCIENCE'
    | 'NEWS'
    | 'VIDEO'
    | 'OTHER'
  >;
  'tags-'?: MaybeArray<
    | 'A1'
    | 'A2'
    | 'B1'
    | 'B2'
    | 'CONVERSATION'
    | 'STORY'
    | 'SCHOOL'
    | 'GRAMMAR'
    | 'NON-FICTION'
    | 'SCIENCE'
    | 'NEWS'
    | 'VIDEO'
    | 'OTHER'
  >;
  vocabulary?: string;
  wordbank?: any;
  imageFile?: File | null;
  audioFile?: File | null;
  created?: unknown;
  updated?: unknown;
}

export interface LessonsCollection {
  type: 'base';
  collectionId: string;
  collectionName: 'lessons';
  response: LessonsResponse;
  create: LessonsCreate;
  update: LessonsUpdate;
  relations: Record<string, never>;
}

// ===== _superusers =====

export interface SuperusersResponse extends AuthCollectionResponse {
  collectionName: '_superusers';
  id: string;
  password: unknown;
  tokenKey: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  created: unknown;
  updated: unknown;
}

export interface SuperusersCreate extends AuthCollectionCreate {
  id: string;
  password: unknown;
  tokenKey: string;
  email: string;
  emailVisibility?: boolean;
  verified?: boolean;
  created?: unknown;
  updated?: unknown;
}

export interface SuperusersUpdate extends AuthCollectionUpdate {
  id?: string;
  password?: unknown;
  tokenKey?: string;
  email?: string;
  emailVisibility?: boolean;
  verified?: boolean;
  created?: unknown;
  updated?: unknown;
}

export interface SuperusersCollection {
  type: 'auth';
  collectionId: string;
  collectionName: '_superusers';
  response: SuperusersResponse;
  create: SuperusersCreate;
  update: SuperusersUpdate;
  relations: Record<string, never>;
}

// ===== _externalAuths =====

export interface ExternalAuthsResponse extends BaseCollectionResponse {
  collectionName: '_externalAuths';
  id: string;
  collectionRef: string;
  recordRef: string;
  provider: string;
  providerId: string;
  created: unknown;
  updated: unknown;
}

export interface ExternalAuthsCreate extends BaseCollectionCreate {
  id: string;
  collectionRef: string;
  recordRef: string;
  provider: string;
  providerId: string;
  created?: unknown;
  updated?: unknown;
}

export interface ExternalAuthsUpdate extends BaseCollectionUpdate {
  id?: string;
  collectionRef?: string;
  recordRef?: string;
  provider?: string;
  providerId?: string;
  created?: unknown;
  updated?: unknown;
}

export interface ExternalAuthsCollection {
  type: 'base';
  collectionId: string;
  collectionName: '_externalAuths';
  response: ExternalAuthsResponse;
  create: ExternalAuthsCreate;
  update: ExternalAuthsUpdate;
  relations: Record<string, never>;
}

// ===== _mfas =====

export interface MfasResponse extends BaseCollectionResponse {
  collectionName: '_mfas';
  id: string;
  collectionRef: string;
  recordRef: string;
  method: string;
  created: unknown;
  updated: unknown;
}

export interface MfasCreate extends BaseCollectionCreate {
  id: string;
  collectionRef: string;
  recordRef: string;
  method: string;
  created?: unknown;
  updated?: unknown;
}

export interface MfasUpdate extends BaseCollectionUpdate {
  id?: string;
  collectionRef?: string;
  recordRef?: string;
  method?: string;
  created?: unknown;
  updated?: unknown;
}

export interface MfasCollection {
  type: 'base';
  collectionId: string;
  collectionName: '_mfas';
  response: MfasResponse;
  create: MfasCreate;
  update: MfasUpdate;
  relations: Record<string, never>;
}

// ===== _otps =====

export interface OtpsResponse extends BaseCollectionResponse {
  collectionName: '_otps';
  id: string;
  collectionRef: string;
  recordRef: string;
  password: unknown;
  sentTo: string;
  created: unknown;
  updated: unknown;
}

export interface OtpsCreate extends BaseCollectionCreate {
  id: string;
  collectionRef: string;
  recordRef: string;
  password: unknown;
  sentTo?: string;
  created?: unknown;
  updated?: unknown;
}

export interface OtpsUpdate extends BaseCollectionUpdate {
  id?: string;
  collectionRef?: string;
  recordRef?: string;
  password?: unknown;
  sentTo?: string;
  created?: unknown;
  updated?: unknown;
}

export interface OtpsCollection {
  type: 'base';
  collectionId: string;
  collectionName: '_otps';
  response: OtpsResponse;
  create: OtpsCreate;
  update: OtpsUpdate;
  relations: Record<string, never>;
}

// ===== _authOrigins =====

export interface AuthOriginsResponse extends BaseCollectionResponse {
  collectionName: '_authOrigins';
  id: string;
  collectionRef: string;
  recordRef: string;
  fingerprint: string;
  created: unknown;
  updated: unknown;
}

export interface AuthOriginsCreate extends BaseCollectionCreate {
  id: string;
  collectionRef: string;
  recordRef: string;
  fingerprint: string;
  created?: unknown;
  updated?: unknown;
}

export interface AuthOriginsUpdate extends BaseCollectionUpdate {
  id?: string;
  collectionRef?: string;
  recordRef?: string;
  fingerprint?: string;
  created?: unknown;
  updated?: unknown;
}

export interface AuthOriginsCollection {
  type: 'base';
  collectionId: string;
  collectionName: '_authOrigins';
  response: AuthOriginsResponse;
  create: AuthOriginsCreate;
  update: AuthOriginsUpdate;
  relations: Record<string, never>;
}

// ===== aiLessons =====

export interface AiLessonsResponse extends BaseCollectionResponse {
  collectionName: 'aiLessons';
  id: string;
  content: any;
  creatorId: string;
  language:
    | ''
    | 'english'
    | 'spanish'
    | 'german'
    | 'french'
    | 'thai'
    | 'japanese'
    | 'korean'
    | 'chinese';
  translationLanguage:
    | ''
    | 'english'
    | 'spanish'
    | 'german'
    | 'french'
    | 'thai'
    | 'korean'
    | 'chinese'
    | 'japanese';
  created: unknown;
  updated: unknown;
}

export interface AiLessonsCreate extends BaseCollectionCreate {
  id: string;
  content?: any;
  creatorId?: string;
  language?:
    | ''
    | 'english'
    | 'spanish'
    | 'german'
    | 'french'
    | 'thai'
    | 'japanese'
    | 'korean'
    | 'chinese';
  translationLanguage?:
    | ''
    | 'english'
    | 'spanish'
    | 'german'
    | 'french'
    | 'thai'
    | 'korean'
    | 'chinese'
    | 'japanese';
  created?: unknown;
  updated?: unknown;
}

export interface AiLessonsUpdate extends BaseCollectionUpdate {
  id?: string;
  content?: any;
  creatorId?: string;
  language?:
    | ''
    | 'english'
    | 'spanish'
    | 'german'
    | 'french'
    | 'thai'
    | 'japanese'
    | 'korean'
    | 'chinese';
  translationLanguage?:
    | ''
    | 'english'
    | 'spanish'
    | 'german'
    | 'french'
    | 'thai'
    | 'korean'
    | 'chinese'
    | 'japanese';
  created?: unknown;
  updated?: unknown;
}

export interface AiLessonsCollection {
  type: 'base';
  collectionId: string;
  collectionName: 'aiLessons';
  response: AiLessonsResponse;
  create: AiLessonsCreate;
  update: AiLessonsUpdate;
  relations: Record<string, never>;
}

// ===== teamGames =====

export interface TeamGamesResponse extends BaseCollectionResponse {
  collectionName: 'teamGames';
  id: string;
  questionbank: string;
  title: string;
  created: unknown;
  updated: unknown;
}

export interface TeamGamesCreate extends BaseCollectionCreate {
  id: string;
  questionbank?: string;
  title?: string;
  created?: unknown;
  updated?: unknown;
}

export interface TeamGamesUpdate extends BaseCollectionUpdate {
  id?: string;
  questionbank?: string;
  title?: string;
  created?: unknown;
  updated?: unknown;
}

export interface TeamGamesCollection {
  type: 'base';
  collectionId: string;
  collectionName: 'teamGames';
  response: TeamGamesResponse;
  create: TeamGamesCreate;
  update: TeamGamesUpdate;
  relations: Record<string, never>;
}

// ===== pictureDescriptions =====

export interface PictureDescriptionsResponse extends BaseCollectionResponse {
  collectionName: 'pictureDescriptions';
  id: string;
  content: any;
  image: string;
  created: unknown;
  updated: unknown;
}

export interface PictureDescriptionsCreate extends BaseCollectionCreate {
  id: string;
  content?: any;
  image?: File | null;
  created?: unknown;
  updated?: unknown;
}

export interface PictureDescriptionsUpdate extends BaseCollectionUpdate {
  id?: string;
  content?: any;
  image?: File | null;
  created?: unknown;
  updated?: unknown;
}

export interface PictureDescriptionsCollection {
  type: 'base';
  collectionId: string;
  collectionName: 'pictureDescriptions';
  response: PictureDescriptionsResponse;
  create: PictureDescriptionsCreate;
  update: PictureDescriptionsUpdate;
  relations: Record<string, never>;
}

// ===== worksheets =====

export interface WorksheetsResponse extends BaseCollectionResponse {
  collectionName: 'worksheets';
  id: string;
  language: '' | 'English' | 'Spanish' | 'French' | 'Thai' | 'German';
  level: '' | 'A1' | 'A2' | 'B1' | 'B2';
  title: string;
  seo: string;
  tags: Array<'science' | 'video' | 'general' | 'fable' | 'M1-2' | 'history'>;
  lessonType:
    | 'worksheet'
    | 'information-gap'
    | 'focused-reading'
    | 'word-blaster';
  image: string;
  audioFile: string;
  content: any;
  videoUrl: string;
  isVideoLesson: boolean;
  creatorId: string;
  slug: string;
  html: string;
  created: unknown;
  updated: unknown;
}

export interface WorksheetsCreate extends BaseCollectionCreate {
  id: string;
  language?: '' | 'English' | 'Spanish' | 'French' | 'Thai' | 'German';
  level?: '' | 'A1' | 'A2' | 'B1' | 'B2';
  title?: string;
  seo?: string;
  tags: MaybeArray<
    'science' | 'video' | 'general' | 'fable' | 'M1-2' | 'history'
  >;
  lessonType:
    | 'worksheet'
    | 'information-gap'
    | 'focused-reading'
    | 'word-blaster';
  image?: File | null;
  audioFile?: File | null;
  content?: any;
  videoUrl?: string | URL;
  isVideoLesson?: boolean;
  creatorId?: string;
  slug?: string;
  html?: string;
  created?: unknown;
  updated?: unknown;
}

export interface WorksheetsUpdate extends BaseCollectionUpdate {
  id?: string;
  language?: '' | 'English' | 'Spanish' | 'French' | 'Thai' | 'German';
  level?: '' | 'A1' | 'A2' | 'B1' | 'B2';
  title?: string;
  seo?: string;
  tags?: MaybeArray<
    'science' | 'video' | 'general' | 'fable' | 'M1-2' | 'history'
  >;
  'tags+'?: MaybeArray<
    'science' | 'video' | 'general' | 'fable' | 'M1-2' | 'history'
  >;
  'tags-'?: MaybeArray<
    'science' | 'video' | 'general' | 'fable' | 'M1-2' | 'history'
  >;
  lessonType?:
    | 'worksheet'
    | 'information-gap'
    | 'focused-reading'
    | 'word-blaster';
  image?: File | null;
  audioFile?: File | null;
  content?: any;
  videoUrl?: string | URL;
  isVideoLesson?: boolean;
  creatorId?: string;
  slug?: string;
  html?: string;
  created?: unknown;
  updated?: unknown;
}

export interface WorksheetsCollection {
  type: 'base';
  collectionId: string;
  collectionName: 'worksheets';
  response: WorksheetsResponse;
  create: WorksheetsCreate;
  update: WorksheetsUpdate;
  relations: Record<string, never>;
}

// ===== stories =====

export interface StoriesResponse extends BaseCollectionResponse {
  collectionName: 'stories';
  id: string;
  title: string;
  language: string;
  cefrLevel: string;
  genre: string;
  totalChapters: number;
  chapters: any;
  chaptersCount: number;
  wordCount: number;
  createdAt: string;
  isCompleted: boolean;
  isPublic: boolean;
  creatorId: Array<string>;
  creatorEmail: string;
  promptNotes: string;
  chapterLength: number;
  outline: string;
  description: string;
  model: string;
  thinkingLevel: string;
  thinkingBudget: number;
  temperature: number;
  translationLanguage: string;
  initialTotalChapters: number;
  initialCreditsEstimate: number;
  creditsCharged: number;
  regenerationsCount: number;
  ratings: any;
  storyBible: any;
  consistencyAudits: any;
  toneRefreshGuidance: string;
  created: unknown;
  updated: unknown;
}

export interface StoriesCreate extends BaseCollectionCreate {
  id: string;
  title?: string;
  language?: string;
  cefrLevel?: string;
  genre?: string;
  totalChapters?: number;
  chapters?: any;
  chaptersCount?: number;
  wordCount?: number;
  createdAt?: string;
  isCompleted?: boolean;
  isPublic?: boolean;
  creatorId?: MaybeArray<string>;
  creatorEmail?: string;
  promptNotes?: string;
  chapterLength?: number;
  outline?: string;
  description?: string;
  model?: string;
  thinkingLevel?: string;
  thinkingBudget?: number;
  temperature?: number;
  translationLanguage?: string;
  initialTotalChapters?: number;
  initialCreditsEstimate?: number;
  creditsCharged?: number;
  regenerationsCount?: number;
  ratings?: any;
  storyBible?: any;
  consistencyAudits?: any;
  toneRefreshGuidance?: string;
  created?: unknown;
  updated?: unknown;
}

export interface StoriesUpdate extends BaseCollectionUpdate {
  id?: string;
  title?: string;
  language?: string;
  cefrLevel?: string;
  genre?: string;
  totalChapters?: number;
  'totalChapters+'?: number;
  'totalChapters-'?: number;
  chapters?: any;
  chaptersCount?: number;
  'chaptersCount+'?: number;
  'chaptersCount-'?: number;
  wordCount?: number;
  'wordCount+'?: number;
  'wordCount-'?: number;
  createdAt?: string;
  isCompleted?: boolean;
  isPublic?: boolean;
  creatorId?: MaybeArray<string>;
  'creatorId+'?: MaybeArray<string>;
  'creatorId-'?: MaybeArray<string>;
  creatorEmail?: string;
  promptNotes?: string;
  chapterLength?: number;
  'chapterLength+'?: number;
  'chapterLength-'?: number;
  outline?: string;
  description?: string;
  model?: string;
  thinkingLevel?: string;
  thinkingBudget?: number;
  'thinkingBudget+'?: number;
  'thinkingBudget-'?: number;
  temperature?: number;
  'temperature+'?: number;
  'temperature-'?: number;
  translationLanguage?: string;
  initialTotalChapters?: number;
  'initialTotalChapters+'?: number;
  'initialTotalChapters-'?: number;
  initialCreditsEstimate?: number;
  'initialCreditsEstimate+'?: number;
  'initialCreditsEstimate-'?: number;
  creditsCharged?: number;
  'creditsCharged+'?: number;
  'creditsCharged-'?: number;
  regenerationsCount?: number;
  'regenerationsCount+'?: number;
  'regenerationsCount-'?: number;
  ratings?: any;
  storyBible?: any;
  consistencyAudits?: any;
  toneRefreshGuidance?: string;
  created?: unknown;
  updated?: unknown;
}

export interface StoriesCollection {
  type: 'base';
  collectionId: string;
  collectionName: 'stories';
  response: StoriesResponse;
  create: StoriesCreate;
  update: StoriesUpdate;
  relations: {
    creatorId: UsersCollection[];
  };
}

// ===== generation_logs =====

export interface GenerationLogsResponse extends BaseCollectionResponse {
  collectionName: 'generation_logs';
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  model: string;
  errorMessage: string;
  timeStamp: string;
  duration: number;
  promptLength: number;
  created: unknown;
  updated: unknown;
}

export interface GenerationLogsCreate extends BaseCollectionCreate {
  id: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  model?: string;
  errorMessage?: string;
  timeStamp?: string;
  duration?: number;
  promptLength?: number;
  created?: unknown;
  updated?: unknown;
}

export interface GenerationLogsUpdate extends BaseCollectionUpdate {
  id?: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  model?: string;
  errorMessage?: string;
  timeStamp?: string;
  duration?: number;
  'duration+'?: number;
  'duration-'?: number;
  promptLength?: number;
  'promptLength+'?: number;
  'promptLength-'?: number;
  created?: unknown;
  updated?: unknown;
}

export interface GenerationLogsCollection {
  type: 'base';
  collectionId: string;
  collectionName: 'generation_logs';
  response: GenerationLogsResponse;
  create: GenerationLogsCreate;
  update: GenerationLogsUpdate;
  relations: Record<string, never>;
}

// ===== Schema =====

export type Schema = {
  users: UsersCollection;
  lessons: LessonsCollection;
  _superusers: SuperusersCollection;
  _externalAuths: ExternalAuthsCollection;
  _mfas: MfasCollection;
  _otps: OtpsCollection;
  _authOrigins: AuthOriginsCollection;
  aiLessons: AiLessonsCollection;
  teamGames: TeamGamesCollection;
  pictureDescriptions: PictureDescriptionsCollection;
  worksheets: WorksheetsCollection;
  stories: StoriesCollection;
  generation_logs: GenerationLogsCollection;
};
