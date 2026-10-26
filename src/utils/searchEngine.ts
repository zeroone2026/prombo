import { Prompt, Category, CommunityPost } from '../types';
import { AuthService } from '../services/authService';

/**
 * Normalizes text for forgiving, multilingual search matching:
 * - Lowercases and trims text
 * - Normalizes Arabic letter variants (Hamza variations, Taa Marbuta)
 * - Strips Arabic vowel marks / diacritics (Tashkeel)
 * - Removes URL punctuation and symbols
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    // Strip Arabic diacritics (tashkeel: fathah, dhammah, kasrah, tanween, sukoon, shaddah)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize Arabic alef forms (أ, إ, آ, ٱ -> ا)
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize Arabic yaa forms (ى -> ي)
    .replace(/ى/g, 'ي')
    // Normalize Arabic taa marbuta (ة -> ه)
    .replace(/ة/g, 'ه');
}

/**
 * Splits query string into normalized search tokens
 */
export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  // Extract clean words/tokens, stripping special URL or handle chars like '@', '#', '?'
  return normalized
    .split(/[\s,+/|]+/)
    .map((token) => token.replace(/^[@#]+/, '').trim())
    .filter((token) => token.length > 0);
}

/**
 * Extracts possible entity IDs if user searches by direct URL or path:
 * e.g., "https://prombo.app/prompt/123", "/prompt/abc", "#prompt-xyz", "?prompt=456", "/user/u-1"
 */
export function extractUrlIdentifiers(rawQuery: string): string[] {
  const ids: string[] = [];
  const trimmed = rawQuery.trim();

  // 1. Direct prompt URL pattern (/prompt/:id or #prompt-:id or ?prompt=:id)
  const promptMatch = trimmed.match(/(?:prompt\/|#prompt-|[?&]prompt=)([a-zA-Z0-9_-]+)/i);
  if (promptMatch && promptMatch[1]) {
    ids.push(promptMatch[1].toLowerCase());
  }

  // 2. Direct post URL pattern (/community?post=:id or #post-:id)
  const postMatch = trimmed.match(/(?:post\/|#post-|[?&]post=)([a-zA-Z0-9_-]+)/i);
  if (postMatch && postMatch[1]) {
    ids.push(postMatch[1].toLowerCase());
  }

  // 3. User profile pattern (/user/:id or @:username)
  const userMatch = trimmed.match(/(?:user\/|@)([a-zA-Z0-9_.-]+)/i);
  if (userMatch && userMatch[1]) {
    ids.push(userMatch[1].toLowerCase());
  }

  return ids;
}

/**
 * Checks if all search tokens match against the combined searchable target strings.
 * Provides forgiving partial / substring matching for every token.
 */
export function matchesAllTokens(searchablePool: string[], tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  if (searchablePool.length === 0) return false;

  const normalizedPool = searchablePool.map(normalizeSearchText);

  // Every token must appear in AT LEAST ONE of the searchable fields in the pool
  return tokens.every((token) =>
    normalizedPool.some((field) => field.includes(token))
  );
}

/**
 * Home Page Search Engine:
 * Scopes to:
 * - Partial Prompt Title
 * - Prompt Description & Prompt Template
 * - AI Model Name (Flux, Midjourney, Claude, GPT, SDXL, etc.)
 * - Category / Subcategory names
 * - Tags
 * - Author / Creator Username / Email / Name
 * - Direct Prompt ID or URL
 */
export function matchesHomeSearch(
  prompt: Prompt,
  categories: Category[],
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim();
  const tokens = tokenizeQuery(rawQuery);
  const urlIds = extractUrlIdentifiers(rawQuery);

  // 1. Direct ID / URL exact match check
  const promptIdNorm = prompt.id.toLowerCase();
  if (urlIds.includes(promptIdNorm)) {
    return true;
  }
  if (promptIdNorm === rawQuery.toLowerCase()) {
    return true;
  }

  // 2. Resolve Category & Subcategory strings
  const category = categories.find((c) => c.id === prompt.categoryId);
  const categoryNames = category
    ? [category.name, category.nameAr || '', category.slug || '']
    : [];

  // 3. Resolve Author / User strings
  const authorStrings: string[] = [];
  if (prompt.author) authorStrings.push(prompt.author);
  if (prompt.authorEmail) authorStrings.push(prompt.authorEmail);
  if (prompt.authorId) {
    authorStrings.push(prompt.authorId);
    try {
      const profile = AuthService.getAllProfiles().find((p) => p.id === prompt.authorId);
      if (profile) {
        authorStrings.push(profile.name);
        if (profile.username) authorStrings.push(profile.username);
        if (profile.email) authorStrings.push(profile.email);
      }
    } catch (e) {}
  }

  // 4. Build comprehensive searchable pool
  const searchablePool: string[] = [
    prompt.title,
    prompt.description || '',
    prompt.prompt || '',
    prompt.targetModel || '',
    prompt.subcategory || '',
    ...(prompt.tags || []),
    ...categoryNames,
    ...authorStrings,
  ];

  return matchesAllTokens(searchablePool, tokens);
}

/**
 * Community Page Search Engine:
 * Scopes to:
 * - Post Content & Replies Content
 * - User Display Name & @handle
 * - Attached Prompt Details (Title, Model, Category)
 * - Direct Post ID or URL
 */
export function matchesCommunitySearch(
  post: CommunityPost,
  query: string,
  prompts: Prompt[] = []
): boolean {
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim();
  const tokens = tokenizeQuery(rawQuery);
  const urlIds = extractUrlIdentifiers(rawQuery);

  // 1. Direct Post ID / URL check
  const postIdNorm = post.id.toLowerCase();
  if (urlIds.includes(postIdNorm) || postIdNorm === rawQuery.toLowerCase()) {
    return true;
  }

  // 2. Resolve Attached Prompt if any
  const attachedPrompt =
    prompts.find((p) => p.id === post.promptId) ||
    (post.promptTitle ? { title: post.promptTitle, targetModel: post.promptModel, categoryId: post.promptCategory } : null);

  const promptPool: string[] = [];
  if (attachedPrompt) {
    if (attachedPrompt.title) promptPool.push(attachedPrompt.title);
    if ('description' in attachedPrompt && (attachedPrompt as any).description) {
      promptPool.push((attachedPrompt as any).description);
    }
    if ('targetModel' in attachedPrompt && attachedPrompt.targetModel) {
      promptPool.push(attachedPrompt.targetModel);
    }
  }

  // 3. Resolve Replies
  const replyPool: string[] = [];
  if (post.replies && post.replies.length > 0) {
    for (const reply of post.replies) {
      if (reply.content) replyPool.push(reply.content);
      if (reply.userName) replyPool.push(reply.userName);
    }
  }

  // 4. Build searchable pool
  const searchablePool: string[] = [
    post.content || '',
    post.userName || '',
    post.userEmail || '',
    post.userId || '',
    ...promptPool,
    ...replyPool,
  ];

  return matchesAllTokens(searchablePool, tokens);
}
