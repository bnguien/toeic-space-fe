import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

export function useRenameFolder() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      vocabularyApi.updateFolder(folderId, { name }),
    onSuccess: () => invalidate(),
  });
}
