import axios from 'axios';

// ── Base URL setup ──────────────────────────────────────────────
// localhost does NOT work from a real device or Android emulator.
//   - Android Emulator → 10.0.2.2
//   - iOS Simulator    → localhost (fine as-is)
//   - Physical device  → your machine's LAN IP, e.g. 192.168.1.5
// Swap BASE_URL below (or wire up an env var / react-native-config) as needed.

const BASE_URL = 'https://www.techt.site/api/content';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Normalizes axios errors into a consistent shape so callers don't need
// to know about axios internals (response vs request vs setup errors).
const handleError = (err) => {
  if (err.response) {
    // Server responded with a non-2xx status
    const { status, data } = err.response;
    throw {
      status,
      message: data?.message || 'Request failed',
      raw: data,
    };
  }
  if (err.request) {
    // Request went out, no response came back (network/timeout/wrong IP)
    throw {
      status: null,
      message: 'No response from server — check your network / base URL',
      raw: err.request,
    };
  }
  // Something else went wrong setting up the request
  throw {
    status: null,
    message: err.message,
    raw: err,
  };
};

// ── Content API calls (mirrors backend routes 1:1) ─────────────

/**
 * POST /api/content
 * Create a new workshop/content document.
 */
export const createContent = async (payload) => {
  try {
    const { data } = await api.post('/', payload);
    return data.data;
  } catch (err) {
    handleError(err);
  }
};
//get by BlockId
export const getBlockById = async (contentId, blockId) => {
  try {
    const { data } = await api.get(`/${contentId}/block/${blockId}`);
    
    return data.data;
  } catch (err) {
  
    handleError(err);
  }
};

/**
 * GET /api/content
 * Fetch all content docs (list view — home screen / CMS dashboard).
 */
export const getAllContents = async () => {
  try {
    const { data } = await api.get('/');
    return data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * GET /api/content/:id
 * Fetch a single doc by Mongo _id.
 */
export const getContentById = async (id) => {
  try {
    const { data } = await api.get(`/${id}`);
    return data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * GET /api/content/slug/:slug
 * Fetch a single doc by its human-readable slug (e.g. "engineering_drawing_gdt").
 * This is what your RN student app should use for screen loads.
 */
export const getContentBySlug = async (slug) => {
  try {
    const { data } = await api.get(`/slug/${slug}`);
    return data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * PUT /api/content/:id
 * Full-document update of top-level fields (title, accent, thumbnail, etc).
 * Does NOT touch blocks — use updateField or replaceBlocks for that.
 */
export const updateContent = async (id, payload) => {
  try {
    const { data } = await api.put(`/${id}`, payload);
    return data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * PATCH /api/content/:id/field
 * Targeted write to a single dot-path inside the blocks tree.
 * path MUST start with "blocks." (enforced server-side).
 *
 * Example:
 *   updateField(id, "blocks.1.items.0.blocks.0.text", "New text")
 */
export const updateField = async (id, path, value) => {
  try {
    const { data } = await api.patch(`/${id}/field`, { path, value });
    return data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * PATCH /api/content/:id/blocks
 * Wholesale overwrite of the entire blocks array.
 * Use when the CMS edits a whole topic/section at once.
 */
export const replaceBlocks = async (id, blocks) => {
  try {
    const { data } = await api.patch(`/${id}/blocks`, { blocks });
    return data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * PATCH /api/content/:id/publish
 * Flip status to "published" and bump version.
 */
export const publishContent = async (id) => {
  try {
    const { data } = await api.patch(`/${id}/publish`);
    return data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * POST /api/content/:id/duplicate
 * Clone a doc as a new draft with a unique slug.
 */
export const duplicateContent = async (id) => {
  try {
    const { data } = await api.post(`/${id}/duplicate`);
    return data.data;
  } catch (err) {
    handleError(err);
  }
};

/**
 * DELETE /api/content/:id
 */
export const deleteContent = async (id) => {
  try {
    const { data } = await api.delete(`/${id}`);
    return data;
  } catch (err) {
    handleError(err);
  }
};

export default api;