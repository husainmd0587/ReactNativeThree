import { useQuery } from '@tanstack/react-query';
import { getContentBySlug, getAllContents, getContentById,getBlockById } from '../contentApi';



export const useBlock = (contentId, blockId) => {
  return useQuery({
    queryKey: ['content', contentId, 'block', blockId],
    queryFn: () => getBlockById(contentId, blockId),
    enabled: !!contentId && !!blockId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Fetches a single content by slug and feeds straight into BlockRenderer.
 *
 * Usage in a screen:
 *   const { data: content, isLoading, error, refetch } = useContent('engineering_drawing_gdt');
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorState message={error.message} onRetry={refetch} />;
 *   return <BlockRenderer blocks={content.blocks} />;
 */
export const useContent = (slug) => {
  return useQuery({
    queryKey: ['content', slug],
    queryFn: () => getContentBySlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 min — content doesn't change often
  });
};

/**
 * Fetches a single content by Mongo _id (useful in the CMS dashboard,
 * where you navigate by _id rather than slug).
 */
export const useContentById = (id) => {
  return useQuery({
    queryKey: ['content', 'id', id],
    queryFn: () => getContentById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Fetches the lightweight list for home/category screens.
 * If your content docs grow large (deep nested blocks), consider adding
 * a separate lean "meta" endpoint server-side instead of using this
 * for list views.
 */
export const useAllcontents = () => {
  return useQuery({
    queryKey: ['contents'],
    queryFn: getAllContents,
    staleTime: 1000 * 60 * 5,
  });
};