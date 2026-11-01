import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

export function useDeleteFolder() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (folderId: string) => vocabularyApi.deleteFolder(folderId),
    onSuccess: () => invalidate(),
  });
}
