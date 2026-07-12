import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateContent,
  updateField,
  replaceBlocks,
  publishContent,
  duplicateContent,
  deleteContent,
} from '../contentApi';

/**
 * CMS-side mutation hooks. Each one invalidates the relevant cached
 * queries on success so screens using usecontent/useAllcontents
 * automatically refetch fresh data — no manual refetch() calls needed.
 *
 * Usage:
 *   const { mutate: saveField, isPending } = useUpdateField();
 *   saveField({ id, path: 'blocks.0.text', value: 'New text' });
 */

export const useUpdateContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateContent(id, payload),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'id', id] });
      queryClient.invalidateQueries({ queryKey: ['content', data?.id] });
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });
};

export const useUpdateField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, path, value }) => updateField(id, path, value),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'id', id] });
      queryClient.invalidateQueries({ queryKey: ['content', data?.id] });
    },
  });
};

export const useReplaceBlocks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, blocks }) => replaceBlocks(id, blocks),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'id', id] });
      queryClient.invalidateQueries({ queryKey: ['content', data?.id] });
    },
  });
};

export const usePublishContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => publishContent(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['content', 'id', id] });
      queryClient.invalidateQueries({ queryKey: ['content', data?.id] });
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });
};

export const useDuplicateContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => duplicateContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contents'] });
    },
  });
};