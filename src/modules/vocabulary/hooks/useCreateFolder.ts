import { useMutation } from "@tanstack/react-query";

import { vocabularyApi } from "../api/vocabulary.api";
import { useInvalidateLibrary } from "./useInvalidateLibrary";

export function useCreateFolder() {
  const invalidate = useInvalidateLibrary();
  return useMutation({
    mutationFn: (name: string) => vocabularyApi.createFolder(name),
    onSuccess: () => invalidate(),
  });
}
