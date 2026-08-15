/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export const Collections = {
	Authorigins: "_authOrigins",
	Externalauths: "_externalAuths",
	Mfas: "_mfas",
	Otps: "_otps",
	Superusers: "_superusers",
	AiLessons: "aiLessons",
	DahootGames: "dahoot_games",
	DahootOptions: "dahoot_options",
	DahootPlayers: "dahoot_players",
	DahootQuestions: "dahoot_questions",
	DahootRooms: "dahoot_rooms",
	DahootSettings: "dahoot_settings",
	DahootUserInfo: "dahoot_user_info",
	DeletionFlags: "deletion_flags",
	GenerationLogs: "generation_logs",
	Lessons: "lessons",
	PictureDescriptions: "pictureDescriptions",
	SavedWords: "saved_words",
	Stories: "stories",
	StoryCompletions: "story_completions",
	StoryHighlights: "story_highlights",
	TeamGames: "teamGames",
	TjComponentsTeacherInfo: "tj_components_teacher_info",
	TjwcSubmissions: "tjwc_submissions",
	Users: "users",
	Worksheets: "worksheets",
} as const
export type Collections = typeof Collections[keyof typeof Collections]

// Alias types for improved usability
export type IsoDateString = string
export type IsoAutoDateString = string & { readonly autodate: unique symbol }
export type RecordIdString = string
export type FileNameString = string & { readonly filename: unique symbol }
export type HTMLString = string

type ExpandType<T> = unknown extends T
	? T extends unknown
		? { expand?: unknown }
		: { expand: T }
	: { expand: T }

// System fields
export type BaseSystemFields<T = unknown> = {
	id: RecordIdString
	collectionId: string
	collectionName: Collections
} & ExpandType<T>

export type AuthSystemFields<T = unknown> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type AuthoriginsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	fingerprint: string
	id: string
	recordRef: string
	updated: IsoAutoDateString
}

export type ExternalauthsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	provider: string
	providerId: string
	recordRef: string
	updated: IsoAutoDateString
}

export type MfasRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	method: string
	recordRef: string
	updated: IsoAutoDateString
}

export type OtpsRecord = {
	collectionRef: string
	created: IsoAutoDateString
	id: string
	password: string
	recordRef: string
	sentTo?: string
	updated: IsoAutoDateString
}

export type SuperusersRecord = {
	created: IsoAutoDateString
	email: string
	emailVisibility?: boolean
	id: string
	password: string
	tokenKey: string
	updated: IsoAutoDateString
	verified?: boolean
}

export const AiLessonsLanguageOptions = {
	"english": "english",
	"spanish": "spanish",
	"german": "german",
	"french": "french",
	"thai": "thai",
	"japanese": "japanese",
	"korean": "korean",
	"chinese": "chinese",
} as const
export type AiLessonsLanguageOptions = typeof AiLessonsLanguageOptions[keyof typeof AiLessonsLanguageOptions]

export const AiLessonsTranslationLanguageOptions = {
	"english": "english",
	"spanish": "spanish",
	"german": "german",
	"french": "french",
	"thai": "thai",
	"korean": "korean",
	"chinese": "chinese",
	"japanese": "japanese",
} as const
export type AiLessonsTranslationLanguageOptions = typeof AiLessonsTranslationLanguageOptions[keyof typeof AiLessonsTranslationLanguageOptions]
export type AiLessonsRecord<Tcontent = unknown> = {
	content?: null | Tcontent
	created: IsoAutoDateString
	creatorId?: string
	id: string
	language?: AiLessonsLanguageOptions
	translationLanguage?: AiLessonsTranslationLanguageOptions
	updated: IsoAutoDateString
}

export type DahootGamesRecord = {
	cefr_level: string
	created: IsoAutoDateString
	creator: string
	description: string
	id: string
	language: string
	subject: string
	title: string
	updated: IsoAutoDateString
}

export const DahootOptionsTypeOptions = {
	"subject": "subject",
	"cefr_level": "cefr_level",
	"language": "language",
} as const
export type DahootOptionsTypeOptions = typeof DahootOptionsTypeOptions[keyof typeof DahootOptionsTypeOptions]
export type DahootOptionsRecord = {
	created: IsoAutoDateString
	id: string
	type: DahootOptionsTypeOptions
	updated: IsoAutoDateString
	value: string
}

export type DahootPlayersRecord<Tanswers = unknown, Tlap_question_ids = unknown, Tmarathon_stats = unknown> = {
	answers?: null | Tanswers
	created: IsoAutoDateString
	id: string
	lap_question_ids?: null | Tlap_question_ids
	last_answer_time?: string
	last_answered_index?: number
	marathon_stats?: null | Tmarathon_stats
	name: string
	room_id: RecordIdString
	score?: number
	session_start_time?: string
	updated: IsoAutoDateString
}

export const DahootQuestionsTypeOptions = {
	"MULTIPLE_CHOICE": "MULTIPLE_CHOICE",
	"SORTING": "SORTING",
	"DRAG_DROP": "DRAG_DROP",
	"DROP_DOWN": "DROP_DOWN",
	"CATEGORIZE": "CATEGORIZE",
	"DISCUSSION": "DISCUSSION",
} as const
export type DahootQuestionsTypeOptions = typeof DahootQuestionsTypeOptions[keyof typeof DahootQuestionsTypeOptions]
export type DahootQuestionsRecord<Toptions = unknown> = {
	correct_option_index?: number
	created: IsoAutoDateString
	game_id: RecordIdString
	id: string
	options: null | Toptions
	text: string
	type: DahootQuestionsTypeOptions
	updated: IsoAutoDateString
}

export const DahootRoomsStatusOptions = {
	"LOBBY": "LOBBY",
	"QUESTION": "QUESTION",
	"LEADERBOARD": "LEADERBOARD",
	"FINISHED": "FINISHED",
	"WRAP_UP": "WRAP_UP",
} as const
export type DahootRoomsStatusOptions = typeof DahootRoomsStatusOptions[keyof typeof DahootRoomsStatusOptions]

export const DahootRoomsPacingModeOptions = {
	"teacher": "teacher",
	"student": "student",
} as const
export type DahootRoomsPacingModeOptions = typeof DahootRoomsPacingModeOptions[keyof typeof DahootRoomsPacingModeOptions]
export type DahootRoomsRecord<Tquestion_ids = unknown> = {
	code: string
	configured_timer_duration?: number
	created: IsoAutoDateString
	current_question_index?: number
	current_question_start_time?: string
	game_id?: RecordIdString
	id: string
	marathon_mode?: boolean
	max_questions?: number
	pacing_mode?: DahootRoomsPacingModeOptions
	question_ids?: null | Tquestion_ids
	question_pool_size?: number
	randomize_questions?: boolean
	status: DahootRoomsStatusOptions
	timer_duration?: number
	updated: IsoAutoDateString
	wrap_up_start_time?: string
	wrap_up_timer?: number
}

export type DahootSettingsRecord = {
	id: string
	key: string
	value: string
}

export const DahootUserInfoRoleOptions = {
	"TEACHER": "TEACHER",
	"ADMIN": "ADMIN",
	"STUDENT": "STUDENT",
	"DISABLED": "DISABLED",
} as const
export type DahootUserInfoRoleOptions = typeof DahootUserInfoRoleOptions[keyof typeof DahootUserInfoRoleOptions]
export type DahootUserInfoRecord = {
	created: IsoAutoDateString
	dahoot_username?: string
	id: string
	invite_code?: string
	role: DahootUserInfoRoleOptions
	school?: string
	updated: IsoAutoDateString
}

export const DeletionFlagsReasonOptions = {
	"inappropriate": "inappropriate",
	"quality": "quality",
	"formatting": "formatting",
	"duplicate": "duplicate",
	"other": "other",
} as const
export type DeletionFlagsReasonOptions = typeof DeletionFlagsReasonOptions[keyof typeof DeletionFlagsReasonOptions]

export const DeletionFlagsStatusOptions = {
	"pending": "pending",
	"reviewed": "reviewed",
	"resolved": "resolved",
} as const
export type DeletionFlagsStatusOptions = typeof DeletionFlagsStatusOptions[keyof typeof DeletionFlagsStatusOptions]
export type DeletionFlagsRecord = {
	comment: string
	createdAt: string
	flaggerEmail?: string
	flaggerId: string
	id: string
	reason: DeletionFlagsReasonOptions
	status: DeletionFlagsStatusOptions
	storyId: string
	storyTitle: string
}

export type GenerationLogsRecord = {
	action?: string
	created: IsoAutoDateString
	duration?: number
	errorMessage?: string
	id: string
	model?: string
	promptLength?: number
	timeStamp?: string
	updated: IsoAutoDateString
	userEmail?: string
	userId?: string
}

export const LessonsLanguageOptions = {
	"English": "English",
	"Thai": "Thai",
	"German": "German",
	"French": "French",
	"Spanish": "Spanish",
} as const
export type LessonsLanguageOptions = typeof LessonsLanguageOptions[keyof typeof LessonsLanguageOptions]

export const LessonsTagsOptions = {
	"A1": "A1",
	"A2": "A2",
	"B1": "B1",
	"B2": "B2",
	"CONVERSATION": "CONVERSATION",
	"STORY": "STORY",
	"SCHOOL": "SCHOOL",
	"GRAMMAR": "GRAMMAR",
	"NON-FICTION": "NON-FICTION",
	"SCIENCE": "SCIENCE",
	"NEWS": "NEWS",
	"VIDEO": "VIDEO",
	"OTHER": "OTHER",
} as const
export type LessonsTagsOptions = typeof LessonsTagsOptions[keyof typeof LessonsTagsOptions]
export type LessonsRecord<Twordbank = unknown> = {
	audioFile?: FileNameString
	audioUrl?: string
	content?: HTMLString
	created: IsoAutoDateString
	creatorId?: string
	id: string
	imageFile?: FileNameString
	imageUrl?: string
	language?: LessonsLanguageOptions
	shareable?: boolean
	tags?: LessonsTagsOptions[]
	title?: string
	updated: IsoAutoDateString
	videoUrl?: string
	vocabulary?: string
	wordbank?: null | Twordbank
}

export type PictureDescriptionsRecord<Tcontent = unknown> = {
	content?: null | Tcontent
	created: IsoAutoDateString
	id: string
	image?: FileNameString
	updated: IsoAutoDateString
}

export type SavedWordsRecord = {
	contextSentence?: string
	definition: string
	easeFactor?: number
	id: string
	interval?: number
	language?: string
	nextReviewDate?: IsoDateString
	partOfSpeech?: string
	repetition?: number
	transliteration?: string
	user: RecordIdString
	word: string
}

export const StoriesCopyrightFlagSourceOptions = {
	"ai": "ai",
	"admin": "admin",
	"backfill": "backfill",
	"user": "user",
} as const
export type StoriesCopyrightFlagSourceOptions = typeof StoriesCopyrightFlagSourceOptions[keyof typeof StoriesCopyrightFlagSourceOptions]
export type StoriesRecord<Tchapters = unknown, TcompletedBy = unknown, TconsistencyAudits = unknown, Tratings = unknown, TstoryBible = unknown> = {
	cefrLevel?: string
	chapterLength?: number
	chapters?: null | Tchapters
	chaptersCount?: number
	completedBy?: null | TcompletedBy
	consistencyAudits?: null | TconsistencyAudits
	copyrightFlag?: boolean
	copyrightFlagReason?: string
	copyrightFlagSource?: StoriesCopyrightFlagSourceOptions
	copyrightFlaggedAt?: IsoDateString
	cover?: FileNameString
	created: IsoAutoDateString
	createdAt?: string
	creatorEmail?: string
	creatorId?: RecordIdString
	creditsCharged?: number
	description?: string
	embedUrl?: string
	genre?: string
	id: string
	initialCreditsEstimate?: number
	initialTotalChapters?: number
	isCompleted?: boolean
	isPublic?: boolean
	language?: string
	model?: string
	outline?: string
	promptNotes?: string
	ratings?: null | Tratings
	regenerationsCount?: number
	sourceType?: string
	storyBible?: null | TstoryBible
	temperature?: number
	thinkingBudget?: number
	thinkingLevel?: string
	title?: string
	toneRefreshGuidance?: string
	totalChapters?: number
	translationLanguage?: string
	updated: IsoAutoDateString
	wordCount?: number
}

export type StoryCompletionsRecord = {
	created: IsoAutoDateString
	id: string
	story: RecordIdString
	timesRead?: number
	updated: IsoAutoDateString
	user: RecordIdString
}

export type StoryHighlightsRecord = {
	chapterIndex?: number
	color: string
	endOffset?: number
	id: string
	note?: string
	paragraphIndex?: number
	startOffset?: number
	story: RecordIdString
	text: string
	user: RecordIdString
}

export type TeamGamesRecord = {
	created: IsoAutoDateString
	id: string
	questionbank?: string
	title?: string
	updated: IsoAutoDateString
}

export type TjComponentsTeacherInfoRecord = {
	created: IsoAutoDateString
	id: string
	name?: string
	school?: string
	updated: IsoAutoDateString
	url?: string
}

export type TjwcSubmissionsRecord = {
	id: string
}

export type UsersRecord<TbeginnerLessons = unknown, Tbookshelf = unknown, TgenerationLimitData = unknown, TpersonalWordBank = unknown, Tplaylist = unknown, TrecentlyRead = unknown, TsavedVocab = unknown, Tstreak = unknown> = {
	avatar?: FileNameString
	beginnerLessons?: null | TbeginnerLessons
	bookshelf?: null | Tbookshelf
	conversationsPlayed?: number
	created: IsoAutoDateString
	dahoot_info?: RecordIdString
	email?: string
	emailVisibility?: boolean
	gamesPlayed?: number
	generationLimitData?: null | TgenerationLimitData
	id: string
	isAdmin?: boolean
	isPaid?: boolean
	lessonsViewed?: number
	lookupLimitData?: string
	name?: string
	password: string
	personalWordBank?: null | TpersonalWordBank
	photoUrl?: string
	playlist?: null | Tplaylist
	readerFontSize?: number
	readerUseSerif?: boolean
	recentlyRead?: null | TrecentlyRead
	savedVocab?: null | TsavedVocab
	streak?: null | Tstreak
	tokenKey: string
	translationTargetLanguage?: string
	updated: IsoAutoDateString
	username: string
	verified?: boolean
	wordbanksCreated?: number
	wordsListenedTo?: number
	wordsTranslated?: number
}

export const WorksheetsLanguageOptions = {
	"English": "English",
	"Spanish": "Spanish",
	"French": "French",
	"Thai": "Thai",
	"German": "German",
} as const
export type WorksheetsLanguageOptions = typeof WorksheetsLanguageOptions[keyof typeof WorksheetsLanguageOptions]

export const WorksheetsLevelOptions = {
	"A1": "A1",
	"A2": "A2",
	"B1": "B1",
	"B2": "B2",
} as const
export type WorksheetsLevelOptions = typeof WorksheetsLevelOptions[keyof typeof WorksheetsLevelOptions]

export const WorksheetsTagsOptions = {
	"science": "science",
	"video": "video",
	"general": "general",
	"fable": "fable",
	"history": "history",
	"science-fiction": "science-fiction",
	"historical-fiction": "historical-fiction",
} as const
export type WorksheetsTagsOptions = typeof WorksheetsTagsOptions[keyof typeof WorksheetsTagsOptions]

export const WorksheetsLessonTypeOptions = {
	"worksheet": "worksheet",
	"information-gap": "information-gap",
	"focused-reading": "focused-reading",
	"word-blaster": "word-blaster",
	"lbl-reader": "lbl-reader",
	"grammar-hearts": "grammar-hearts",
	"listening": "listening",
	"speed-review": "speed-review",
	"chapter-book": "chapter-book",
	"pronunciation": "pronunciation",
	"quiz-element": "quiz-element",
} as const
export type WorksheetsLessonTypeOptions = typeof WorksheetsLessonTypeOptions[keyof typeof WorksheetsLessonTypeOptions]
export type WorksheetsRecord<Tcontent = unknown, TcustomConfig = unknown> = {
	audioFile?: FileNameString
	content?: null | Tcontent
	created: IsoAutoDateString
	creatorId?: string
	customConfig?: null | TcustomConfig
	html?: HTMLString
	htmlCompiled?: string
	id: string
	image?: FileNameString
	isVideoLesson?: boolean
	language?: WorksheetsLanguageOptions
	lessonType: WorksheetsLessonTypeOptions
	level?: WorksheetsLevelOptions
	notForBlog?: boolean
	seo?: string
	slug?: string
	tags: WorksheetsTagsOptions[]
	teacherCode?: string
	title?: string
	updated: IsoAutoDateString
	videoUrl?: string
}

// Response types include system fields and match responses from the PocketBase API
export type AuthoriginsResponse<Texpand = unknown> = Required<AuthoriginsRecord> & BaseSystemFields<Texpand>
export type ExternalauthsResponse<Texpand = unknown> = Required<ExternalauthsRecord> & BaseSystemFields<Texpand>
export type MfasResponse<Texpand = unknown> = Required<MfasRecord> & BaseSystemFields<Texpand>
export type OtpsResponse<Texpand = unknown> = Required<OtpsRecord> & BaseSystemFields<Texpand>
export type SuperusersResponse<Texpand = unknown> = Required<SuperusersRecord> & AuthSystemFields<Texpand>
export type AiLessonsResponse<Tcontent = unknown, Texpand = unknown> = Required<AiLessonsRecord<Tcontent>> & BaseSystemFields<Texpand>
export type DahootGamesResponse<Texpand = unknown> = Required<DahootGamesRecord> & BaseSystemFields<Texpand>
export type DahootOptionsResponse<Texpand = unknown> = Required<DahootOptionsRecord> & BaseSystemFields<Texpand>
export type DahootPlayersResponse<Tanswers = unknown, Tlap_question_ids = unknown, Tmarathon_stats = unknown, Texpand = unknown> = Required<DahootPlayersRecord<Tanswers, Tlap_question_ids, Tmarathon_stats>> & BaseSystemFields<Texpand>
export type DahootQuestionsResponse<Toptions = unknown, Texpand = unknown> = Required<DahootQuestionsRecord<Toptions>> & BaseSystemFields<Texpand>
export type DahootRoomsResponse<Tquestion_ids = unknown, Texpand = unknown> = Required<DahootRoomsRecord<Tquestion_ids>> & BaseSystemFields<Texpand>
export type DahootSettingsResponse<Texpand = unknown> = Required<DahootSettingsRecord> & BaseSystemFields<Texpand>
export type DahootUserInfoResponse<Texpand = unknown> = Required<DahootUserInfoRecord> & BaseSystemFields<Texpand>
export type DeletionFlagsResponse<Texpand = unknown> = Required<DeletionFlagsRecord> & BaseSystemFields<Texpand>
export type GenerationLogsResponse<Texpand = unknown> = Required<GenerationLogsRecord> & BaseSystemFields<Texpand>
export type LessonsResponse<Twordbank = unknown, Texpand = unknown> = Required<LessonsRecord<Twordbank>> & BaseSystemFields<Texpand>
export type PictureDescriptionsResponse<Tcontent = unknown, Texpand = unknown> = Required<PictureDescriptionsRecord<Tcontent>> & BaseSystemFields<Texpand>
export type SavedWordsResponse<Texpand = unknown> = Required<SavedWordsRecord> & BaseSystemFields<Texpand>
export type StoriesResponse<Tchapters = unknown, TcompletedBy = unknown, TconsistencyAudits = unknown, Tratings = unknown, TstoryBible = unknown, Texpand = unknown> = Required<StoriesRecord<Tchapters, TcompletedBy, TconsistencyAudits, Tratings, TstoryBible>> & BaseSystemFields<Texpand>
export type StoryCompletionsResponse<Texpand = unknown> = Required<StoryCompletionsRecord> & BaseSystemFields<Texpand>
export type StoryHighlightsResponse<Texpand = unknown> = Required<StoryHighlightsRecord> & BaseSystemFields<Texpand>
export type TeamGamesResponse<Texpand = unknown> = Required<TeamGamesRecord> & BaseSystemFields<Texpand>
export type TjComponentsTeacherInfoResponse<Texpand = unknown> = Required<TjComponentsTeacherInfoRecord> & BaseSystemFields<Texpand>
export type TjwcSubmissionsResponse<Texpand = unknown> = Required<TjwcSubmissionsRecord> & BaseSystemFields<Texpand>
export type UsersResponse<TbeginnerLessons = unknown, Tbookshelf = unknown, TgenerationLimitData = unknown, TpersonalWordBank = unknown, Tplaylist = unknown, TrecentlyRead = unknown, TsavedVocab = unknown, Tstreak = unknown, Texpand = unknown> = Required<UsersRecord<TbeginnerLessons, Tbookshelf, TgenerationLimitData, TpersonalWordBank, Tplaylist, TrecentlyRead, TsavedVocab, Tstreak>> & AuthSystemFields<Texpand>
export type WorksheetsResponse<Tcontent = unknown, TcustomConfig = unknown, Texpand = unknown> = Required<WorksheetsRecord<Tcontent, TcustomConfig>> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	_authOrigins: AuthoriginsRecord
	_externalAuths: ExternalauthsRecord
	_mfas: MfasRecord
	_otps: OtpsRecord
	_superusers: SuperusersRecord
	aiLessons: AiLessonsRecord
	dahoot_games: DahootGamesRecord
	dahoot_options: DahootOptionsRecord
	dahoot_players: DahootPlayersRecord
	dahoot_questions: DahootQuestionsRecord
	dahoot_rooms: DahootRoomsRecord
	dahoot_settings: DahootSettingsRecord
	dahoot_user_info: DahootUserInfoRecord
	deletion_flags: DeletionFlagsRecord
	generation_logs: GenerationLogsRecord
	lessons: LessonsRecord
	pictureDescriptions: PictureDescriptionsRecord
	saved_words: SavedWordsRecord
	stories: StoriesRecord
	story_completions: StoryCompletionsRecord
	story_highlights: StoryHighlightsRecord
	teamGames: TeamGamesRecord
	tj_components_teacher_info: TjComponentsTeacherInfoRecord
	tjwc_submissions: TjwcSubmissionsRecord
	users: UsersRecord
	worksheets: WorksheetsRecord
}

export type CollectionResponses = {
	_authOrigins: AuthoriginsResponse
	_externalAuths: ExternalauthsResponse
	_mfas: MfasResponse
	_otps: OtpsResponse
	_superusers: SuperusersResponse
	aiLessons: AiLessonsResponse
	dahoot_games: DahootGamesResponse
	dahoot_options: DahootOptionsResponse
	dahoot_players: DahootPlayersResponse
	dahoot_questions: DahootQuestionsResponse
	dahoot_rooms: DahootRoomsResponse
	dahoot_settings: DahootSettingsResponse
	dahoot_user_info: DahootUserInfoResponse
	deletion_flags: DeletionFlagsResponse
	generation_logs: GenerationLogsResponse
	lessons: LessonsResponse
	pictureDescriptions: PictureDescriptionsResponse
	saved_words: SavedWordsResponse
	stories: StoriesResponse
	story_completions: StoryCompletionsResponse
	story_highlights: StoryHighlightsResponse
	teamGames: TeamGamesResponse
	tj_components_teacher_info: TjComponentsTeacherInfoResponse
	tjwc_submissions: TjwcSubmissionsResponse
	users: UsersResponse
	worksheets: WorksheetsResponse
}

// Utility types for create/update operations

type ProcessCreateAndUpdateFields<T> = Omit<{
	// Omit AutoDate fields
	[K in keyof T as Extract<T[K], IsoAutoDateString> extends never ? K : never]: 
		// Convert FileNameString to File
		T[K] extends infer U ? 
			U extends (FileNameString | FileNameString[]) ? 
				U extends any[] ? File[] : File 
			: U
		: never
}, 'id'>

// Create type for Auth collections
export type CreateAuth<T> = {
	id?: RecordIdString
	email: string
	emailVisibility?: boolean
	password: string
	passwordConfirm: string
	verified?: boolean
} & ProcessCreateAndUpdateFields<T>

// Create type for Base collections
export type CreateBase<T> = {
	id?: RecordIdString
} & ProcessCreateAndUpdateFields<T>

// Update type for Auth collections
export type UpdateAuth<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof AuthSystemFields>
> & {
	email?: string
	emailVisibility?: boolean
	oldPassword?: string
	password?: string
	passwordConfirm?: string
	verified?: boolean
}

// Update type for Base collections
export type UpdateBase<T> = Partial<
	Omit<ProcessCreateAndUpdateFields<T>, keyof BaseSystemFields>
>

// Get the correct create type for any collection
export type Create<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? CreateAuth<CollectionRecords[T]>
		: CreateBase<CollectionRecords[T]>

// Get the correct update type for any collection
export type Update<T extends keyof CollectionResponses> =
	CollectionResponses[T] extends AuthSystemFields
		? UpdateAuth<CollectionRecords[T]>
		: UpdateBase<CollectionRecords[T]>

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = {
	collection<T extends keyof CollectionResponses>(
		idOrName: T
	): RecordService<CollectionResponses[T]>
} & PocketBase
