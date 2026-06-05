// Custom Hooks for API Operations and Data Management
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../lib/api';

// Hook for fetching paginated data
export function usePaginatedData(endpoint, options = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(options.pageSize || 20);
  const [filters, setFilters] = useState(options.initialFilters || {});
  const dataRef = useRef(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [endpoint, page, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page,
        page_size: pageSize,
        ...filters,
      });
      const response = await api.get(`${endpoint}?${params}`);
      return response.data;
    },
    ...options.queryOptions,
  });

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const nextPage = useCallback(() => {
    if (dataRef.current?.has_next) {
      setPage(prev => prev + 1);
    }
  }, []);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  }, [page]);

  const goToPage = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  return {
    data: data?.results || [],
    total: data?.total || 0,
    page,
    pageSize,
    totalPages: data?.total_pages || 0,
    hasNext: data?.has_next || false,
    hasPrevious: page > 1,
    isLoading,
    error,
    nextPage,
    previousPage,
    goToPage,
    setPageSize,
    filters,
    updateFilters,
    refetch,
  };
}

// Hook for CRUD operations on a resource
export function useResource(resourceName, options = {}) {
  const queryClient = useQueryClient();
  const endpoint = options.endpoint || `/api/${resourceName}`;

  // Fetch all
  const useList = (queryOptions = {}) => useQuery({
    queryKey: [resourceName],
    queryFn: async () => {
      const response = await api.get(endpoint);
      return response.data;
    },
    ...queryOptions,
  });

  // Fetch one
  const useOne = (id, queryOptions = {}) => useQuery({
    queryKey: [resourceName, id],
    queryFn: async () => {
      const response = await api.get(`${endpoint}/${id}`);
      return response.data;
    },
    enabled: !!id,
    ...queryOptions,
  });

  // Create
  const useCreate = (mutationOptions = {}) => {
    const { onSuccess: customOnSuccess, ...restOptions } = mutationOptions;
    return useMutation({
      mutationFn: async (data) => {
        const response = await api.post(endpoint, data);
        return response.data;
      },
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: [resourceName] });
        if (options.invalidateRelated) {
          options.invalidateRelated.forEach(key => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
        customOnSuccess?.(...args);
      },
      ...restOptions,
    });
  };

  // Update
  const useUpdate = (mutationOptions = {}) => {
    const { onSuccess: customOnSuccess, ...restOptions } = mutationOptions;
    return useMutation({
      mutationFn: async ({ id, data }) => {
        const response = await api.put(`${endpoint}/${id}`, data);
        return response.data;
      },
      onSuccess: (...args) => {
        const [, variables] = args;
        queryClient.invalidateQueries({ queryKey: [resourceName] });
        queryClient.invalidateQueries({ queryKey: [resourceName, variables.id] });
        if (options.invalidateRelated) {
          options.invalidateRelated.forEach(key => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
        customOnSuccess?.(...args);
      },
      ...restOptions,
    });
  };

  // Delete
  const useDelete = (mutationOptions = {}) => {
    const { onSuccess: customOnSuccess, ...restOptions } = mutationOptions;
    return useMutation({
      mutationFn: async (id) => {
        await api.delete(`${endpoint}/${id}`);
      },
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: [resourceName] });
        if (options.invalidateRelated) {
          options.invalidateRelated.forEach(key => {
            queryClient.invalidateQueries({ queryKey: [key] });
          });
        }
        customOnSuccess?.(...args);
      },
      ...restOptions,
    });
  };

  return {
    useList,
    useOne,
    useCreate,
    useUpdate,
    useDelete,
  };
}

// Hook for optimistic updates
export function useOptimisticMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(options.queryKey);

      // Optimistically update
      if (options.optimisticUpdate) {
        queryClient.setQueryData(options.queryKey, options.optimisticUpdate(previousData, variables));
      }

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }
      options.onError?.(err, variables, context);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: options.queryKey });
    },
    ...options,
  });
}

// Hook for infinite scroll
export function useInfiniteScroll(endpoint, options = {}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: [endpoint, JSON.stringify(options.filters)],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam,
        page_size: options.pageSize || 20,
        ...options.filters,
      });
      const response = await api.get(`${endpoint}?${params}`);
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_next ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    ...options.queryOptions,
  });

  const allItems = data?.pages?.flatMap(page => page.results) || [];

  return {
    items: allItems,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  };
}

// Hook for real-time data with polling
export function usePolling(endpoint, interval = 5000, options = {}) {
  return useQuery({
    ...options,
    queryKey: [endpoint, 'polling'],
    queryFn: async () => {
      const response = await api.get(endpoint);
      return response.data;
    },
    refetchInterval: interval,
    refetchIntervalInBackground: options.refetchInBackground || false,
  });
}

// Hook for batch operations
export function useBatchMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const mutation = useMutation({
    mutationFn: async (items) => {
      setProgress({ current: 0, total: items.length });
      const results = [];

      for (let i = 0; i < items.length; i++) {
        try {
          const result = await mutationFn(items[i]);
          results.push({ success: true, data: result });
        } catch (error) {
          results.push({ success: false, error });
        }
        setProgress({ current: i + 1, total: items.length });
      }

      return results;
    },
    onSuccess: () => {
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    },
    ...options,
  });

  return {
    ...mutation,
    progress,
  };
}

// Hook for form submission with validation
export function useFormSubmit(submitFn, options = {}) {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const submit = useCallback(async (data) => {
    setErrors({});
    setIsSubmitting(true);

    const { validate, onSuccess, onError } = optionsRef.current;

    try {
      if (validate) {
        const validationErrors = validate(data);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          setIsSubmitting(false);
          return { success: false, errors: validationErrors };
        }
      }

      const result = await submitFn(data);
      setIsSubmitting(false);
      await onSuccess?.(result);
      return { success: true, data: result };
    } catch (error) {
      setIsSubmitting(false);
      const errorMessage = error.response?.data?.message || 'An error occurred';
      setErrors({ submit: errorMessage });
      onError?.(error);
      return { success: false, error: errorMessage };
    }
  }, [submitFn]);

  return {
    submit,
    errors,
    isSubmitting,
    setErrors,
  };
}


